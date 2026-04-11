/**
 * Manage KYC Edge Function
 * - Toggle KYC enabled/disabled
 * - Auto-add wallet to on-chain allowlist (when KYC disabled)
 * Uses ADMIN_PRIVATE_KEY to sign on-chain transactions.
 */
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "npm:@solana/web3.js@1.98.4";
import { Buffer } from "node:buffer";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PROGRAM_ID = new PublicKey("7YWWyNwtHSKHoxNm5fw2Sh73QRcFPUzCQ7qntJM7HgnG");
const RPC_URL = "https://api.devnet.solana.com";

function deriveAllowlistPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("allowlist")],
    PROGRAM_ID,
  );
}

async function disc(methodName: string): Promise<Uint8Array> {
  const msgBuffer = new TextEncoder().encode(`global:${methodName}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return new Uint8Array(hashBuffer).slice(0, 8);
}

async function loadAdminKeypair(): Promise<Keypair> {
  const adminKeyRaw = Deno.env.get("ADMIN_PRIVATE_KEY");
  if (!adminKeyRaw) throw new Error("ADMIN_PRIVATE_KEY not configured.");
  try {
    const parsed = JSON.parse(adminKeyRaw);
    return Keypair.fromSecretKey(Uint8Array.from(parsed));
  } catch {
    const { default: bs58 } = await import("npm:bs58@5.0.0");
    return Keypair.fromSecretKey(bs58.decode(adminKeyRaw));
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { action } = body;

    // ─── Toggle KYC ──────────────────────────────────────
    if (action === "toggle_kyc") {
      const { enabled, admin_wallet } = body;
      if (typeof enabled !== "boolean") {
        return new Response(
          JSON.stringify({ error: "enabled must be boolean" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Verify admin
      const { data: isAdmin } = await supabase.rpc("is_admin_wallet", { wallet: admin_wallet });
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Not authorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      await supabase.from("protocol_settings").update({
        kyc_enabled: enabled,
        updated_at: new Date().toISOString(),
        updated_by: admin_wallet,
      }).not("id", "is", null); // update all rows (single row table)

      return new Response(
        JSON.stringify({ success: true, kyc_enabled: enabled }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ─── Ensure wallet on on-chain allowlist ─────────────
    if (action === "ensure_allowlist") {
      const { wallet } = body;
      if (!wallet) {
        return new Response(
          JSON.stringify({ error: "wallet required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const connection = new Connection(RPC_URL, "confirmed");
      const adminKeypair = await loadAdminKeypair();
      const [allowlistPda] = deriveAllowlistPda();

      // Check if allowlist PDA exists
      const allowlistInfo = await connection.getAccountInfo(allowlistPda);
      
      if (!allowlistInfo) {
        // Initialize the allowlist first
        console.log("Allowlist PDA not found, initializing...");
        try {
          const initDisc = await disc("initialize");
          const initIx = new TransactionInstruction({
            programId: PROGRAM_ID,
            keys: [
              { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: true },
              { pubkey: allowlistPda, isSigner: false, isWritable: true },
              { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            data: Buffer.from(initDisc),
          });

          const initTx = new Transaction().add(initIx);
          initTx.feePayer = adminKeypair.publicKey;
          const latestBh = await connection.getLatestBlockhash();
          initTx.recentBlockhash = latestBh.blockhash;
          initTx.sign(adminKeypair);
          const initSig = await connection.sendRawTransaction(initTx.serialize(), { skipPreflight: true });
          console.log("Initialize tx sent:", initSig);
          await connection.confirmTransaction({ signature: initSig, ...latestBh }, "confirmed");
          console.log("Allowlist initialized:", initSig);
          // Wait a moment for the account to be queryable
          await new Promise(r => setTimeout(r, 2000));
        } catch (initErr: any) {
          console.error("Initialize failed:", initErr.message?.slice(0, 500));
          // If init truly failed, we can't proceed
          const checkInfo = await connection.getAccountInfo(allowlistPda);
          if (!checkInfo) {
            return new Response(
              JSON.stringify({ error: "Allowlist PDA not initialized. Run 'initialize' from Solana Playground first.", details: initErr.message }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        }
      }

      // Check if wallet is already on the allowlist
      const memberPk = new PublicKey(wallet);
      
      // Re-fetch allowlist to check members
      const updatedInfo = await connection.getAccountInfo(allowlistPda);
      if (updatedInfo && updatedInfo.data) {
        const data = updatedInfo.data.slice(8); // skip discriminator
        const vecLen = data.readUInt32LE(32);
        for (let i = 0; i < vecLen; i++) {
          const offset = 36 + i * 32;
          if (offset + 32 > data.length) break;
          const existingMember = new PublicKey(data.slice(offset, offset + 32));
          if (existingMember.equals(memberPk)) {
            return new Response(
              JSON.stringify({ success: true, already_on_list: true }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        }
      }

      // Add to allowlist
      const addDisc = await disc("add_to_allowlist");
      const addData = Buffer.concat([
        Buffer.from(addDisc),
        memberPk.toBuffer(),
      ]);

      const addIx = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: false },
          { pubkey: allowlistPda, isSigner: false, isWritable: true },
        ],
        data: addData,
      });

      const addTx = new Transaction().add(addIx);
      addTx.feePayer = adminKeypair.publicKey;
      const { blockhash: bh2 } = await connection.getLatestBlockhash();
      addTx.recentBlockhash = bh2;
      addTx.sign(adminKeypair);
      const addSig = await connection.sendRawTransaction(addTx.serialize(), { skipPreflight: true });
      const latestBh2 = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature: addSig, ...latestBh2 }, "confirmed");

      // Also add to database allowlist
      await supabase.from("allowlist").upsert(
        { wallet_address: wallet, added_by: "auto_kyc_bypass" },
        { onConflict: "wallet_address" }
      );

      console.log(`Added ${wallet} to on-chain allowlist:`, addSig);
      return new Response(
        JSON.stringify({ success: true, txSignature: addSig }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use toggle_kyc or ensure_allowlist" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("manage-kyc error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
