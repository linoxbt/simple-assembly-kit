import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import MetricCard from "@/components/MetricCard";
import RatioGauge from "@/components/RatioGauge";
import ComplianceStatusPanel from "@/components/ComplianceStatusPanel";
import TravelRulePanel from "@/components/TravelRulePanel";
import KytEventsPanel from "@/components/KytEventsPanel";
import TransactionHistoryPanel from "@/components/TransactionHistoryPanel";
import { VaultState } from "@/hooks/useVault";
import { formatUsd, formatOz, formatRatio } from "@/utils/format";
import { TRAVEL_RULE_THRESHOLD } from "@/utils/constants";
import { depositCollateral, mintXusd, burnXusd } from "@/services/anchorProgram";
import { toast } from "sonner";

interface VaultDashboardProps {
  vault: VaultState;
  prices: { symbol: string; price: number; source: string }[];
}

const VaultDashboard = ({ vault, prices }: VaultDashboardProps) => {
  const { publicKey, signTransaction, connected } = useWallet();
  const [depositOz, setDepositOz] = useState("");
  const [mintUsd, setMintUsd] = useState("");
  const [burnUsd, setBurnUsd] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const mintAmount = parseFloat(mintUsd) || 0;
  const showTravelRule = mintAmount >= TRAVEL_RULE_THRESHOLD;
  const xagPrice = prices.find((p) => p.symbol === "XAG/USD")?.price ?? 0;

  const handleDeposit = async () => {
    if (!connected || !publicKey || !signTransaction) {
      toast.error("Connect your wallet first");
      return;
    }
    const oz = parseFloat(depositOz);
    if (!oz || oz <= 0) return;
    setLoading("deposit");
    try {
      const result = await depositCollateral(publicKey, oz, signTransaction);
      if (result.success) {
        toast.success(`Deposited ${oz} oz XAU`, { description: `TX: ${result.txSignature?.slice(0, 12)}…` });
        setDepositOz("");
      }
    } catch (err: any) {
      toast.error("Deposit failed", { description: err.message });
    } finally {
      setLoading(null);
    }
  };

  const handleMint = async () => {
    if (!connected || !publicKey || !signTransaction) {
      toast.error("Connect your wallet first");
      return;
    }
    if (!mintAmount || mintAmount <= 0) return;
    setLoading("mint");
    try {
      const result = await mintXusd(publicKey, mintAmount, signTransaction);
      if (result.success) {
        toast.success(`Minted ${formatUsd(mintAmount)} xUSD`, { description: `TX: ${result.txSignature?.slice(0, 12)}…` });
        setMintUsd("");
      }
    } catch (err: any) {
      toast.error("Mint failed", { description: err.message });
    } finally {
      setLoading(null);
    }
  };

  const handleBurn = async () => {
    if (!connected || !publicKey || !signTransaction) {
      toast.error("Connect your wallet first");
      return;
    }
    const usd = parseFloat(burnUsd);
    if (!usd || usd <= 0) return;
    setLoading("burn");
    try {
      const result = await burnXusd(publicKey, usd, signTransaction);
      if (result.success) {
        toast.success(`Burned ${formatUsd(usd)} xUSD`, { description: `TX: ${result.txSignature?.slice(0, 12)}…` });
        setBurnUsd("");
      }
    } catch (err: any) {
      toast.error("Burn failed", { description: err.message });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {!connected && (
        <div className="text-xs tracking-wider text-center py-2 rounded border border-warning text-warning bg-warning/5">
          ⚠ CONNECT WALLET TO INTERACT WITH VAULT
        </div>
      )}

      <div className={`text-xs tracking-wider text-center py-2 rounded border ${
        vault.isKycVerified
          ? "border-success text-success bg-success/5"
          : "border-destructive text-destructive bg-destructive/5"
      }`}>
        {vault.isKycVerified ? "✓ KYC VERIFIED — WALLET ON ALLOWLIST" : "✗ KYC NOT VERIFIED — ADD WALLET VIA ADMIN PANEL"}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Collateral" value={formatOz(vault.collateralOz)} sub={`≈${formatUsd(vault.collateralUsdValue)}`} colorClass="text-primary gold-glow" />
        <MetricCard label="xUSD Minted" value={formatUsd(vault.xusdDebt)} sub="outstanding" colorClass="text-success" />
        <MetricCard label="Collateral Ratio" value={`${formatRatio(vault.collateralRatio)}`} sub={vault.health.toUpperCase()} colorClass={vault.health === "healthy" ? "text-success" : vault.health === "warning" ? "text-warning" : "text-destructive"} />
        <MetricCard label="Max Mintable" value={formatUsd(vault.maxMintable)} sub="at 150% ratio" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <RatioGauge ratio={vault.collateralRatio} health={vault.health} />

          {/* Deposit */}
          <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Deposit XAU Collateral</div>
            <div className="flex gap-2">
              <input type="number" placeholder="oz" value={depositOz} onChange={(e) => setDepositOz(e.target.value)} className="flex-1 bg-surface border border-card-border rounded px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              <button onClick={handleDeposit} disabled={loading === "deposit" || !connected} className="px-6 py-2 text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-30 transition-colors rounded tracking-wider font-medium">
                {loading === "deposit" ? "SENDING…" : "DEPOSIT →"}
              </button>
            </div>
          </div>

          {/* Mint */}
          <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Mint xUSD</div>
            <div className="flex gap-2">
              <input type="number" placeholder="USD" value={mintUsd} onChange={(e) => setMintUsd(e.target.value)} className="flex-1 bg-surface border border-card-border rounded px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              <button onClick={handleMint} disabled={showTravelRule || loading === "mint" || !connected} className="px-6 py-2 text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-30 transition-colors rounded tracking-wider font-medium">
                {loading === "mint" ? "SENDING…" : "MINT →"}
              </button>
            </div>
            {showTravelRule && <div className="mt-3"><TravelRulePanel amount={mintAmount} onSubmit={handleMint} /></div>}
          </div>

          {/* Burn */}
          <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Burn xUSD / Reclaim Collateral</div>
            <div className="flex gap-2">
              <input type="number" placeholder="xUSD" value={burnUsd} onChange={(e) => setBurnUsd(e.target.value)} className="flex-1 bg-surface border border-card-border rounded px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              <button onClick={handleBurn} disabled={loading === "burn" || !connected} className="px-6 py-2 text-xs border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-30 transition-colors rounded tracking-wider font-medium">
                {loading === "burn" ? "SENDING…" : "BURN →"}
              </button>
            </div>
          </div>

          {/* Transaction History */}
          <TransactionHistoryPanel />
        </div>

        <div className="space-y-4">
          <ComplianceStatusPanel isKycVerified={vault.isKycVerified} xauPrice={vault.xauPriceUsd} xagPrice={xagPrice} priceSource={vault.priceFromSix ? "SIX BFI" : "Pyth"} />
          <KytEventsPanel />
        </div>
      </div>
    </div>
  );
};

export default VaultDashboard;
