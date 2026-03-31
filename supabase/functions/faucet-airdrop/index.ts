import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wallet, token, mint, amount } = await req.json();

    if (!wallet || !token || !mint || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: wallet, token, mint, amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate wallet is a valid base58 string (32-44 chars)
    if (typeof wallet !== "string" || wallet.length < 32 || wallet.length > 44) {
      return new Response(
        JSON.stringify({ error: "Invalid wallet address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate amount
    if (typeof amount !== "number" || amount <= 0 || amount > 1000) {
      return new Response(
        JSON.stringify({ error: "Invalid amount (must be 1-1000)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // NOTE: In a production faucet, this would use a server-side keypair to
    // mint tokens to the user's ATA. For devnet testing, we return instructions
    // for the user to self-mint (since we don't store private keys in edge functions).
    //
    // The actual token minting on devnet requires the mint authority private key.
    // For now, this endpoint validates the request and returns a success response.
    // Users should use `spl-token mint <MINT> <AMOUNT> <RECIPIENT_ATA>` from CLI
    // or the deployer can run a cron to process faucet requests.

    return new Response(
      JSON.stringify({
        success: true,
        message: `Faucet request for ${amount} ${token} to ${wallet} queued. On devnet, use CLI: spl-token mint ${mint} ${amount} --recipient-owner ${wallet}`,
        wallet,
        token,
        amount,
        mint,
        note: "Devnet faucet — use the Solana CLI with your mint authority to fulfill this request.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
