import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { PublicKey, Transaction } from "@solana/web3.js";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import { useVault } from "@/hooks/useVault";
import {
  SOLANA_NETWORK,
  COLLATERAL_MINT,
  XUSD_MINT,
  TOKEN_2022_PROGRAM_ID,
} from "@/utils/constants";
import {
  connection,
  fetchTokenBalance,
  COLLATERAL_MINT_PK,
  XUSD_MINT_PK,
} from "@/services/anchorProgram";

interface FaucetToken {
  symbol: string;
  name: string;
  description: string;
  amount: number;
  unit: string;
  mint: string;
}

const FAUCET_TOKENS: FaucetToken[] = [
  {
    symbol: "XAU",
    name: "Tokenised Gold (Collateral)",
    description:
      "Test collateral representing 1 oz of gold. Deposit into AurumX vaults to mint xUSD. No real value — devnet only.",
    amount: 10,
    unit: "oz",
    mint: COLLATERAL_MINT,
  },
  {
    symbol: "xUSD",
    name: "AurumX Stablecoin",
    description:
      "Gold-backed stablecoin minted by the AurumX protocol. Normally minted via vault deposit — this faucet gives you a small amount for testing.",
    amount: 500,
    unit: "xUSD",
    mint: XUSD_MINT,
  },
];

const Faucet = () => {
  const { connected, publicKey } = useWallet();
  const { prices, primarySource } = usePriceFeed();
  const xauPrice = prices.find((p) => p.symbol === "XAU/USD")?.price ?? 0;
  const { vault } = useVault(xauPrice);
  const [loading, setLoading] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState("faucet");
  const [balances, setBalances] = useState<Record<string, number>>({});

  const refreshBalances = async () => {
    if (!publicKey) return;
    const [xauBal, xusdBal] = await Promise.all([
      fetchTokenBalance(publicKey, COLLATERAL_MINT_PK),
      fetchTokenBalance(publicKey, XUSD_MINT_PK),
    ]);
    setBalances({ XAU: xauBal, xUSD: xusdBal });
  };

  const handleClaim = async (token: FaucetToken) => {
    if (!connected || !publicKey) {
      toast.error("Connect your wallet first");
      return;
    }
    const claimCount = claimed[token.symbol] ?? 0;
    if (claimCount >= 5) {
      toast.error(`Maximum claims reached for ${token.symbol}`);
      return;
    }
    setLoading(token.symbol);
    try {
      // Call the edge function to airdrop tokens
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/faucet-airdrop`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
          },
          body: JSON.stringify({
            wallet: publicKey.toBase58(),
            token: token.symbol,
            mint: token.mint,
            amount: token.amount,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || "Airdrop request failed");
      }

      setClaimed((prev) => ({
        ...prev,
        [token.symbol]: (prev[token.symbol] ?? 0) + 1,
      }));

      toast.success(`Airdropped ${token.amount} ${token.unit} ${token.symbol}`, {
        description: result.txSignature ? (
          <a
            href={`https://explorer.solana.com/tx/${result.txSignature}?cluster=${SOLANA_NETWORK}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View on Explorer →
          </a>
        ) : "Tokens sent to your wallet",
      });

      // Refresh balances after a short delay
      setTimeout(refreshBalances, 3000);
    } catch (err: any) {
      toast.error("Airdrop failed", { description: err.message });
    } finally {
      setLoading(null);
    }
  };

  // Refresh balances on mount
  useState(() => {
    if (publicKey) refreshBalances();
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="scanline-overlay" />
      <Header
        xauPrice={vault.xauPriceUsd}
        priceSource={primarySource}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary gold-glow tracking-widest mb-2">
            DEVNET FAUCET
          </h1>
          <p className="text-xs text-muted-foreground tracking-wider max-w-md mx-auto">
            Request free test tokens to interact with the AurumX protocol on
            Solana devnet.
          </p>
        </div>

        {!connected && (
          <div className="text-xs tracking-wider text-center py-3 rounded border border-primary/40 text-primary/70 bg-primary/5 mb-6">
            ⚠ CONNECT YOUR WALLET TO CLAIM TOKENS
          </div>
        )}

        {connected && (
          <div className="bg-card border border-primary/20 rounded-lg p-4 mb-6">
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-2">
              YOUR TOKEN BALANCES
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">XAU (Collateral)</span>
                <span className="text-primary font-semibold">
                  {(balances.XAU ?? vault.xauBalance ?? 0).toFixed(4)} oz
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">xUSD (Stablecoin)</span>
                <span className="text-primary font-semibold">
                  {(balances.xUSD ?? vault.xusdBalance ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-card border border-primary/20 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-primary text-lg">◎</span>
            <div>
              <div className="text-xs font-semibold text-primary tracking-wider mb-1">
                NEED DEVNET SOL?
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                You need devnet SOL for transaction fees. Get free SOL from the{" "}
                <a
                  href="https://faucet.solana.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline"
                >
                  official Solana faucet
                </a>
                {" "}or run{" "}
                <code className="text-[10px] bg-surface px-1.5 py-0.5 rounded border border-card-border">
                  solana airdrop 2
                </code>{" "}
                in your terminal.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {FAUCET_TOKENS.map((token) => {
            const claimCount = claimed[token.symbol] ?? 0;
            const maxReached = claimCount >= 5;
            return (
              <div
                key={token.symbol}
                className="bg-card border border-card-border rounded-lg p-5 card-glow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-primary">
                        {token.symbol}
                      </span>
                      <span className="text-[10px] text-muted-foreground tracking-wider">
                        {token.name.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed max-w-md">
                      {token.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                      Mint: {token.mint.slice(0, 8)}…{token.mint.slice(-4)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="text-xl font-bold text-primary">
                      {token.amount}
                    </div>
                    <div className="text-[10px] text-muted-foreground tracking-wider">
                      {token.unit} / claim
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground tracking-wider">
                    {claimCount}/5 claims used
                  </span>
                  <button
                    onClick={() => handleClaim(token)}
                    disabled={!connected || loading === token.symbol || maxReached}
                    className="px-6 py-2 text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-30 transition-colors rounded tracking-wider font-medium"
                  >
                    {loading === token.symbol
                      ? "AIRDROPPING…"
                      : maxReached
                      ? "MAX CLAIMED"
                      : `CLAIM ${token.symbol} →`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-card border border-card-border rounded-lg p-5 mt-6 card-glow">
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-4">
            HOW AURUMX WORKS
          </div>
          <div className="space-y-3 text-[11px] text-muted-foreground leading-relaxed">
            {[
              "Get devnet SOL — for gas fees. Free from the Solana faucet.",
              "Claim mock XAU — this is your tokenised gold collateral. No real value.",
              "Deposit XAU into vault — the protocol locks your gold and lets you borrow up to 66% of its USD value.",
              "Mint xUSD — the protocol mints gold-backed stablecoins to your wallet, maintaining a 150% collateral ratio.",
              "Return xUSD to reclaim gold — burn your xUSD debt and the vault releases your XAU collateral back.",
            ].map((text, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-primary font-bold flex-shrink-0">
                  {i + 1}.
                </span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Faucet;
