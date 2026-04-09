import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Connection, Keypair, PublicKey, Transaction } from "npm:@solana/web3.js@1.98.4";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
} from "npm:@solana/spl-token@0.4.9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RPC_URL = "https://api.devnet.solana.com";
const TOKEN_DECIMALS = 6;
const FAUCET_CONFIG = {
  XAU: {
    mint: "6iEUnETuLah7aumoqgv8nzhfUS965YebwYFSoUmg8qpu",
    amount: 10,
  },
  xUSD: {
    mint: "8BAHWKUJZxXt4qafmJcQBGbEk77aqxoWyYoNZwp6EorS",
    amount: 500,
  },
} as const;

function toRawAmount(amount: number) {
  return BigInt(Math.round(amount * 10 ** TOKEN_DECIMALS));
}

async function loadAdminKeypair() {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wallet, token, mint } = await req.json();

    if (!wallet || !token || !mint) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: wallet, token, mint" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof wallet !== "string" || wallet.length < 32 || wallet.length > 44) {
      return new Response(
        JSON.stringify({ error: "Invalid wallet address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const faucet = token === "XAU" ? FAUCET_CONFIG.XAU : token === "xUSD" ? FAUCET_CONFIG.xUSD : null;
    if (!faucet || faucet.mint !== mint) {
      return new Response(
        JSON.stringify({ error: "Unsupported faucet token or mint mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const connection = new Connection(RPC_URL, "confirmed");
    const adminKeypair = await loadAdminKeypair();
    const recipient = new PublicKey(wallet);
    const mintPk = new PublicKey(faucet.mint);
    const recipientAta = getAssociatedTokenAddressSync(
      mintPk,
      recipient,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    const instructions = [];
    const recipientAtaInfo = await connection.getAccountInfo(recipientAta);
    if (!recipientAtaInfo) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          adminKeypair.publicKey,
          recipientAta,
          recipient,
          mintPk,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
      );
    }

    instructions.push(
      createMintToInstruction(
        mintPk,
        recipientAta,
        adminKeypair.publicKey,
        toRawAmount(faucet.amount),
        [],
        TOKEN_PROGRAM_ID,
      ),
    );

    const tx = new Transaction().add(...instructions);
    tx.feePayer = adminKeypair.publicKey;
    const latestBlockhash = await connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockhash.blockhash;
    tx.sign(adminKeypair);

    const txSignature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
    await connection.confirmTransaction({ signature: txSignature, ...latestBlockhash }, "confirmed");

    return new Response(
      JSON.stringify({
        success: true,
        wallet,
        token,
        amount: faucet.amount,
        mint: faucet.mint,
        recipientAta: recipientAta.toBase58(),
        txSignature,
        message: `${faucet.amount} ${token} minted on-chain to ${wallet}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
