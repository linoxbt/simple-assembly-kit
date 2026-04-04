/**
 * Price Keeper Edge Function
 * Primary: SIX BFI Financial Data API (XAU/USD spot price)
 * Fallback: Pyth Hermes API
 * Writes price on-chain via update_price instruction and stores in price_history table.
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
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROGRAM_ID = new PublicKey("7YWWyNwtHSKHoxNm5fw2Sh73QRcFPUzCQ7qntJM7HgnG");
const RPC_URL = "https://api.devnet.solana.com";

// SIX BFI Financial Data API
const SIX_BFI_API_URL = "https://web-api.six-group.com/api/findata/v1";

// Pyth Hermes fallback
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

/**
 * Try fetching XAU/USD from SIX BFI Financial Data API.
 * SIX provides institutional-grade precious metals pricing.
 */
async function fetchSixBfiPrice(): Promise<{ price: number; source: string } | null> {
  try {
    const sixApiKey = Deno.env.get("SIX_BFI_API_KEY");
    
    // SIX BFI listings endpoint for gold spot price
    const url = `${SIX_BFI_API_URL}/listings/marketData?scheme=VALOR_BC&ids=XAU`;
    const headers: Record<string, string> = {
      "Accept": "application/json",
    };
    if (sixApiKey) {
      headers["X-Api-Key"] = sixApiKey;
    }

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      console.warn(`SIX BFI API returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    // SIX returns listings with lastPrice or officialClose
    const listing = data?.data?.listings?.[0];
    if (!listing) {
      console.warn("SIX BFI: no listing data returned");
      return null;
    }

    const price = listing.marketData?.lastPrice?.value 
      ?? listing.marketData?.officialClose?.value
      ?? null;

    if (!price || price <= 0) {
      console.warn("SIX BFI: no valid price in response");
      return null;
    }

    console.log(`SIX BFI XAU/USD: $${price}`);
    return { price: Number(price), source: "SIX BFI" };
  } catch (err) {
    console.warn("SIX BFI fetch failed:", err);
    return null;
  }
}

/**
 * Fallback: fetch XAU/USD from Pyth Hermes API
 */
async function fetchPythPrice(): Promise<{ price: number; source: string } | null> {
  try {
    const params = new URLSearchParams();
    params.append("ids[]", PYTH_XAU_FEED);
    const res = await fetch(`${PYTH_HERMES_URL}?${params.toString()}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Pyth API error: ${res.status}`);
    
    const data = await res.json();
    const feed = data.parsed?.[0];
    if (!feed) throw new Error("No price data from Pyth");

    const rawPrice = parseInt(feed.price.price);
    const expo = feed.price.expo;
    const price = rawPrice * Math.pow(10, expo);

    console.log(`Pyth XAU/USD: $${price}`);
    return { price, source: "Pyth" };
  } catch (err) {
    console.warn("Pyth fetch failed:", err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const adminKeyRaw = Deno.env.get("ADMIN_PRIVATE_KEY");
    if (!adminKeyRaw) {
      return new Response(
        JSON.stringify({ error: "ADMIN_PRIVATE_KEY not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse admin keypair
    let adminKeypair: Keypair;
    try {
      const parsed = JSON.parse(adminKeyRaw);
      adminKeypair = Keypair.fromSecretKey(Uint8Array.from(parsed));
    } catch {
      const { default: bs58 } = await import("npm:bs58@5.0.0");
      adminKeypair = Keypair.fromSecretKey(bs58.decode(adminKeyRaw));
    }

    // --- Price fetch: SIX BFI primary, Pyth fallback ---
    let priceResult = await fetchSixBfiPrice();
    if (!priceResult) {
      console.log("SIX BFI unavailable, falling back to Pyth...");
      priceResult = await fetchPythPrice();
    }
    if (!priceResult) {
      return new Response(
        JSON.stringify({ error: "Both SIX BFI and Pyth oracles unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { price: priceUsd, source } = priceResult;
    const priceRaw = BigInt(Math.floor(priceUsd * 1_000_000));
    const publishedAt = BigInt(Math.floor(Date.now() / 1000));

    // Build update_price instruction
    const assetBytes = new Uint8Array(8);
    const encoder = new TextEncoder();
    const assetEncoded = encoder.encode("XAU/USD");
    assetBytes.set(assetEncoded.slice(0, 8));

    const [pricePda] = derivePricePda("XAU/USD");
    const discriminator = await disc("update_price");
    // from_six = 1 if SIX BFI, 0 if Pyth
    const fromSixByte = new Uint8Array([source === "SIX BFI" ? 1 : 0]);

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

    // --- Store price in price_history table ---
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from("price_history").insert({
      asset: "XAU/USD",
      price: priceUsd,
      source,
      tx_signature: txSig,
    });

    const result = {
      success: true,
      price: priceUsd,
      priceRaw: priceRaw.toString(),
      source,
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
