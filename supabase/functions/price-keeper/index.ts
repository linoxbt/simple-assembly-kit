/**
 * Price Keeper Edge Function
 * Fetches XAU/USD from Pyth Hermes API and writes on-chain via update_price instruction.
 * Requires ADMIN_PRIVATE_KEY secret (base58 or JSON array).
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROGRAM_ID = new PublicKey("7YWWyNwtHSKHoxNm5fw2Sh73QRcFPUzCQ7qntJM7HgnG");
const RPC_URL = "https://api.devnet.solana.com";
const PYTH_XAU_FEED = "0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2";
const PYTH_HERMES_URL = "https://hermes.pyth.network/v2/updates/price/latest";

function derivePricePda(assetName: string): [PublicKey, number] {
  const assetBytes = Buffer.alloc(8);
  assetBytes.write(assetName);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("price"), assetBytes],
    PROGRAM_ID
  );
}

async function disc(methodName: string): Promise<Uint8Array> {
  const msgBuffer = new TextEncoder().encode(`global:${methodName}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return new Uint8Array(hashBuffer).slice(0, 8);
}

function encodeU64(val: bigint): Uint8Array {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setBigUint64(0, val, true);
  return new Uint8Array(buf);
}

function encodeI64(val: bigint): Uint8Array {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setBigInt64(0, val, true);
  return new Uint8Array(buf);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const adminKeyRaw = Deno.env.get("ADMIN_PRIVATE_KEY");
    if (!adminKeyRaw) {
      return new Response(
        JSON.stringify({ error: "ADMIN_PRIVATE_KEY not configured. Add it as a secret." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse admin keypair (supports JSON array or base58)
    let adminKeypair: Keypair;
    try {
      const parsed = JSON.parse(adminKeyRaw);
      adminKeypair = Keypair.fromSecretKey(Uint8Array.from(parsed));
    } catch {
      const { default: bs58 } = await import("npm:bs58@5.0.0");
      adminKeypair = Keypair.fromSecretKey(bs58.decode(adminKeyRaw));
    }

    // Fetch XAU/USD from Pyth Hermes
    const params = new URLSearchParams();
    params.append("ids[]", PYTH_XAU_FEED);
    const pythRes = await fetch(`${PYTH_HERMES_URL}?${params.toString()}`);
    if (!pythRes.ok) throw new Error(`Pyth API error: ${pythRes.status}`);

    const pythData = await pythRes.json();
    const feed = pythData.parsed?.[0];
    if (!feed) throw new Error("No price data from Pyth");

    const rawPrice = parseInt(feed.price.price);
    const expo = feed.price.expo;
    const priceUsd = rawPrice * Math.pow(10, expo);
    const priceRaw = BigInt(Math.floor(priceUsd * 1_000_000));
    const publishedAt = BigInt(feed.price.publish_time);

    // Build update_price instruction
    const assetBytes = new Uint8Array(8);
    const encoder = new TextEncoder();
    const assetEncoded = encoder.encode("XAU/USD");
    assetBytes.set(assetEncoded.slice(0, 8));

    const [pricePda] = derivePricePda("XAU/USD");
    const discriminator = await disc("update_price");
    const fromSixByte = new Uint8Array([0]);

    const data = Buffer.from(new Uint8Array([
      ...discriminator,
      ...assetBytes,
      ...encodeU64(priceRaw),
      ...encodeI64(publishedAt),
      ...fromSixByte,
    ]));

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: pricePda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    const connection = new Connection(RPC_URL, "confirmed");
    const tx = new Transaction().add(ix);
    tx.feePayer = adminKeypair.publicKey;
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.sign(adminKeypair);

    const txSig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
    await connection.confirmTransaction(txSig, "confirmed");

    const result = {
      success: true,
      price: priceUsd,
      priceRaw: priceRaw.toString(),
      publishedAt: Number(publishedAt),
      txSignature: txSig,
      keeper: adminKeypair.publicKey.toBase58(),
    };

    console.log("Price updated on-chain:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Price keeper error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
