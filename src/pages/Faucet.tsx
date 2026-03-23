import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import { useVault } from "@/hooks/useVault";
import { SOLANA_NETWORK } from "@/utils/constants";

interface FaucetToken {
  symbol: string;
  name: string;
  description: string;
  amount: number;
  unit: string;
  colorClass: string;
  borderClass: string;
  bgClass: string;
}

const FAUCET_TOKENS: FaucetToken[] = [
  {
    symbol: "XAU",
    name: "Mock Tokenised Gold",
    description:
      "Test collateral representing 1 oz of gold. Deposit into AurumX vaults to mint xUSD. No real value — devnet only.",
    amount: 10,
    unit: "oz",
    colorClass: "text-primary",
    borderClass: "border-primary",
    bgClass: "bg-primary/5",
  },
  {
    symbol: "xUSD",
    name: "AurumX Stablecoin",
    description:
      "Gold-backed stablecoin minted by the AurumX protocol. Normally minted via vault deposit — this faucet gives you a small amount for testing transfers and compliance flows.",
    amount: 500,
    unit: "xUSD",
    colorClass: "text-success",
    borderClass: "border-success",
    bgClass: "bg-success/5",
  },
];

const Faucet = () => {
  const { connected, publicKey } = useWallet();
  const { prices, primarySource } = usePriceFeed();
  const xauPrice = prices.find((p) => p.symbol === "XAU/USD")?.price ?? 2345.67;
  const { vault } = useVault(xauPrice);
  const [loading, setLoading] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState("faucet");

  const handleClaim = async (token: FaucetToken) => {
    if (!connected || !publicKey) {
      toast.error("Connect your wallet first");
      return;
    }

    const claimCount = claimed[token.symbol] ?? 0;
    if (claimCount >= 3) {
      toast.error(`Maximum claims reached for ${token.symbol}`, {
        description: "You can claim up to 3 times per session.",
      });
      return;
    }

    setLoading(token.symbol);
    try {
      // Simulate airdrop delay
      await new Promise((r) => setTimeout(r, 1800));

      const mockSig = `faucet_${token.symbol.toLowerCase()}_${Date.now().toString(36)}`;
      setClaimed((prev) => ({ ...prev, [token.symbol]: (prev[token.symbol] ?? 0) + 1 }));

      toast.success(`Airdropped ${token.amount} ${token.unit} ${token.symbol}`, {
        description: (
          <a
            href={`https://explorer.solana.com/tx/${mockSig}?cluster=${SOLANA_NETWORK}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View on Explorer →
          </a>
        ),
      });
    } catch (err: any) {
      toast.error("Airdrop failed", { description: err.message });
    } finally {
      setLoading(null);
    }
  };

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
            Request free test tokens to interact with the AurumX protocol on Solana devnet. No real money involved.
          </p>
        </div>

        {!connected && (
          <div className="text-xs tracking-wider text-center py-3 rounded border border-warning text-warning bg-warning/5 mb-6">
            ⚠ CONNECT YOUR WALLET TO CLAIM TOKENS
          </div>
        )}

        {/* SOL reminder */}
        <div className="bg-card border border-info/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-info text-lg">◎</span>
            <div>
              <div className="text-xs font-semibold text-info tracking-wider mb-1">
                NEED DEVNET SOL?
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                You need devnet SOL for transaction fees. Get free SOL from the{" "}
                <a
                  href="https://faucet.solana.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-info underline hover:no-underline"
                >
                  official Solana faucet
                </a>{" "}
                or run{" "}
                <code className="text-[10px] bg-surface px-1.5 py-0.5 rounded border border-card-border">
                  solana airdrop 2
                </code>{" "}
                in your terminal.
              </p>
            </div>
          </div>
        </div>

        {/* Token cards */}
        <div className="space-y-4">
          {FAUCET_TOKENS.map((token) => {
            const claimCount = claimed[token.symbol] ?? 0;
            const maxReached = claimCount >= 3;

            return (
              <div
                key={token.symbol}
                className={`bg-card border ${token.borderClass}/30 rounded-lg p-5 card-glow`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-lg font-bold ${token.colorClass}`}>
                        {token.symbol}
                      </span>
                      <span className="text-[10px] text-muted-foreground tracking-wider">
                        {token.name.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed max-w-md">
                      {token.description}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className={`text-xl font-bold ${token.colorClass}`}>
                      {token.amount}
                    </div>
                    <div className="text-[10px] text-muted-foreground tracking-wider">
                      {token.unit} / claim
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground tracking-wider">
                    {claimCount}/3 claims used
                  </span>
                  <button
                    onClick={() => handleClaim(token)}
                    disabled={!connected || loading === token.symbol || maxReached}
                    className={`px-6 py-2 text-xs border ${token.borderClass} ${token.colorClass} hover:bg-primary hover:text-primary-foreground disabled:opacity-30 transition-colors rounded tracking-wider font-medium`}
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

        {/* How it works */}
        <div className="bg-card border border-card-border rounded-lg p-5 mt-6 card-glow">
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-4">
            HOW AURUMX WORKS
          </div>
          <div className="space-y-3 text-[11px] text-muted-foreground leading-relaxed">
            <div className="flex gap-3">
              <span className="text-primary font-bold flex-shrink-0">1.</span>
              <span>
                <strong className="text-foreground">Get devnet SOL</strong> — for gas fees.
                Free from the Solana faucet.
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-primary font-bold flex-shrink-0">2.</span>
              <span>
                <strong className="text-foreground">Claim mock XAU</strong> — this is your
                tokenised gold collateral. No real value.
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-primary font-bold flex-shrink-0">3.</span>
              <span>
                <strong className="text-foreground">Deposit XAU into vault</strong> — the
                protocol locks your gold and lets you borrow up to 66% of its USD value.
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-primary font-bold flex-shrink-0">4.</span>
              <span>
                <strong className="text-foreground">Mint xUSD</strong> — the protocol mints
                gold-backed stablecoins to your wallet, maintaining a 150% collateral ratio.
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-primary font-bold flex-shrink-0">5.</span>
              <span>
                <strong className="text-foreground">Return xUSD to reclaim gold</strong> — burn
                your xUSD debt and the vault releases your XAU collateral back.
              </span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Faucet;
