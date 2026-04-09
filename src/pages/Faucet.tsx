import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import { useVault } from "@/hooks/useVault";
import {
  SOLANA_NETWORK,
  COLLATERAL_MINT,
  XUSD_MINT,
} from "@/utils/constants";
import {
  connection,
  fetchTokenBalance,
  requestSolAirdrop,
  COLLATERAL_MINT_PK,
  XUSD_MINT_PK,
  parseProgramError,
} from "@/services/anchorProgram";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

const Faucet = () => {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { prices, primarySource } = usePriceFeed();
  const { vault } = useVault();
  const [loading, setLoading] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("faucet");
  const [balances, setBalances] = useState<{ xau: number; xusd: number; sol: number }>({ xau: 0, xusd: 0, sol: 0 });

  const refreshBalances = async () => {
    if (!publicKey) return;
    const [xauBal, xusdBal, solBal] = await Promise.all([
      fetchTokenBalance(publicKey, COLLATERAL_MINT_PK),
      fetchTokenBalance(publicKey, XUSD_MINT_PK),
      connection.getBalance(publicKey),
    ]);
    setBalances({ xau: xauBal, xusd: xusdBal, sol: solBal / LAMPORTS_PER_SOL });
  };

  useEffect(() => {
    if (publicKey) refreshBalances();
  }, [publicKey]);

  const handleSolAirdrop = async () => {
    if (!publicKey) return;
    setLoading("sol");
    setTxStatus("Requesting SOL airdrop...");
    try {
      const sig = await requestSolAirdrop(publicKey);
      setTxStatus(`Confirmed ✓ 1 SOL airdropped. tx: ${sig.slice(0, 8)}...`);
      toast.success("1 SOL airdropped!", {
        description: (
          <a href={`https://explorer.solana.com/tx/${sig}?cluster=${SOLANA_NETWORK}`} target="_blank" rel="noopener noreferrer" className="underline">
            View on Explorer →
          </a>
        ),
      });
      setTimeout(refreshBalances, 2000);
    } catch (err: any) {
      const msg = parseProgramError(err);
      setTxStatus(`Error: ${msg}`);
      toast.error("Airdrop failed", { description: msg });
    } finally {
      setLoading(null);
    }
  };

  const handleTokenClaim = async (tokenSymbol: string) => {
    if (!publicKey) return;
    setLoading(tokenSymbol);
      setTxStatus(`Minting ${tokenSymbol} on-chain...`);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const mint = tokenSymbol === "XAU" ? COLLATERAL_MINT : XUSD_MINT;
      const amount = tokenSymbol === "XAU" ? 10 : 500;

      const response = await fetch(`${supabaseUrl}/functions/v1/faucet-airdrop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          token: tokenSymbol,
          mint,
          amount,
        }),
      });

      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || "Faucet request failed");

      if (!result.txSignature) {
        throw new Error(result.error || result.message || "Faucet mint did not return a transaction signature");
      }

      setTxStatus(`Confirmed ✓ ${amount} ${tokenSymbol} sent. tx: ${result.txSignature.slice(0, 8)}...`);
      toast.success(`${amount} ${tokenSymbol} sent on-chain!`, {
        description: (
          <a href={`https://explorer.solana.com/tx/${result.txSignature}?cluster=${SOLANA_NETWORK}`} target="_blank" rel="noopener noreferrer" className="underline">
            View on Explorer →
          </a>
        ),
      });
      setTimeout(refreshBalances, 3000);
    } catch (err: any) {
      const msg = parseProgramError(err);
      setTxStatus(`Error: ${msg}`);
      toast.error("Faucet failed", { description: msg });
    } finally {
      setLoading(null);
    }
  };

  const displayPrice = vault.xauPriceUsd > 0
    ? vault.xauPriceUsd
    : prices.find((p) => p.symbol === "XAU/USD")?.price ?? 0;

  // ─── NOT CONNECTED ─────────────────────────────────────
  if (!connected) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="scanline-overlay" />
        <Header xauPrice={displayPrice} priceSource={primarySource} activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl flex flex-col items-center justify-center">
          <img src="/aurumx-logo.png" alt="AurumX" className="h-16 w-16 mx-auto opacity-60 mb-4" />
          <h2 className="text-lg font-bold text-primary tracking-widest mb-2">CONNECT WALLET</h2>
          <p className="text-xs text-muted-foreground mb-6">Connect your wallet to use the devnet faucet.</p>
          <button onClick={() => setVisible(true)} className="px-8 py-3 text-sm border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors rounded tracking-wider font-medium">
            CONNECT WALLET →
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="scanline-overlay" />
      <Header xauPrice={displayPrice} priceSource={primarySource} activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary gold-glow tracking-widest mb-2">DEVNET FAUCET</h1>
          <p className="text-xs text-muted-foreground tracking-wider max-w-md mx-auto">
            Get free devnet tokens to test AurumX. Every claim sends a real transaction.
          </p>
        </div>

        {/* Tx Status */}
        {txStatus && (
          <div className={`text-xs tracking-wider text-center py-2 rounded border mb-4 ${
            txStatus.startsWith("Confirmed") ? "border-primary/40 text-primary bg-primary/5" :
            txStatus.startsWith("Error") ? "border-destructive/40 text-destructive bg-destructive/5" :
            "border-accent/40 text-accent bg-accent/5"
          }`}>
            {txStatus}
          </div>
        )}

        {/* Current Balances */}
        <div className="bg-card border border-primary/20 rounded-lg p-4 mb-6">
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-2">YOUR BALANCES (LIVE FROM CHAIN)</div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">SOL</span>
              <span className="text-primary font-semibold">{balances.sol.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">XAU</span>
              <span className="text-primary font-semibold">{balances.xau.toFixed(4)} oz</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">xUSD</span>
              <span className="text-primary font-semibold">{balances.xusd.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* SOL Airdrop */}
        <div className="bg-card border border-card-border rounded-lg p-5 card-glow mb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold text-primary">◎ SOL</span>
                <span className="text-[10px] text-muted-foreground tracking-wider">DEVNET SOL FOR GAS</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed max-w-md">
                You need devnet SOL for transaction fees. This calls Solana's native airdrop.
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-4">
              <div className="text-xl font-bold text-primary">1</div>
              <div className="text-[10px] text-muted-foreground tracking-wider">SOL / claim</div>
            </div>
          </div>
          <button
            onClick={handleSolAirdrop}
            disabled={loading === "sol"}
            className="w-full py-2 text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-30 transition-colors rounded tracking-wider font-medium"
          >
            {loading === "sol" ? "REQUESTING AIRDROP…" : "AIRDROP SOL →"}
          </button>
        </div>

        {/* XAU Token */}
        <div className="bg-card border border-card-border rounded-lg p-5 card-glow mb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold text-primary">XAU</span>
                <span className="text-[10px] text-muted-foreground tracking-wider">TOKENISED GOLD (COLLATERAL)</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed max-w-md">
                Test collateral for vaults. Deposit into AurumX to mint xUSD.
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">Mint: {COLLATERAL_MINT.slice(0, 8)}…{COLLATERAL_MINT.slice(-4)}</p>
            </div>
            <div className="text-right flex-shrink-0 ml-4">
              <div className="text-xl font-bold text-primary">10</div>
              <div className="text-[10px] text-muted-foreground tracking-wider">oz / claim</div>
            </div>
          </div>
          <button
            onClick={() => handleTokenClaim("XAU")}
            disabled={loading === "XAU"}
            className="w-full py-2 text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-30 transition-colors rounded tracking-wider font-medium"
          >
            {loading === "XAU" ? "REQUESTING…" : "CLAIM XAU →"}
          </button>
        </div>

        {/* xUSD Token */}
        <div className="bg-card border border-card-border rounded-lg p-5 card-glow mb-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold text-primary">xUSD</span>
                <span className="text-[10px] text-muted-foreground tracking-wider">GOLD-BACKED STABLECOIN</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed max-w-md">
                Normally minted via vault deposit. This faucet gives you test xUSD.
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">Mint: {XUSD_MINT.slice(0, 8)}…{XUSD_MINT.slice(-4)}</p>
            </div>
            <div className="text-right flex-shrink-0 ml-4">
              <div className="text-xl font-bold text-primary">500</div>
              <div className="text-[10px] text-muted-foreground tracking-wider">xUSD / claim</div>
            </div>
          </div>
          <button
            onClick={() => handleTokenClaim("xUSD")}
            disabled={loading === "xUSD"}
            className="w-full py-2 text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-30 transition-colors rounded tracking-wider font-medium"
          >
            {loading === "xUSD" ? "REQUESTING…" : "CLAIM xUSD →"}
          </button>
        </div>

        {/* How it works */}
        <div className="bg-card border border-card-border rounded-lg p-5 card-glow">
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-4">HOW AURUMX WORKS</div>
          <div className="space-y-3 text-[11px] text-muted-foreground leading-relaxed">
            {[
              "Get devnet SOL — for gas fees. Free from the airdrop above.",
              "Claim mock XAU — tokenised gold collateral (no real value).",
              "Deposit XAU into vault — locks gold on-chain, your wallet signs the tx.",
              "Mint xUSD — protocol mints gold-backed stablecoins at 150% collateral ratio.",
              "Burn xUSD to reclaim gold — your wallet signs, the vault releases XAU.",
            ].map((text, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-primary font-bold flex-shrink-0">{i + 1}.</span>
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
