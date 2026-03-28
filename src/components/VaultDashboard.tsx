import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import MetricCard from "@/components/MetricCard";
import RatioGauge from "@/components/RatioGauge";
import ComplianceStatusPanel from "@/components/ComplianceStatusPanel";
import KytEventsPanel from "@/components/KytEventsPanel";
import TransactionHistoryPanel from "@/components/TransactionHistoryPanel";
import LiquidationMonitor from "@/components/LiquidationMonitor";
import ProtocolDiagram from "@/components/ProtocolDiagram";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import AllowlistRequestButton from "@/components/AllowlistRequestButton";
import { useProtocolStore } from "@/stores/protocolStore";
import { useVaultNotifications } from "@/hooks/useVaultNotifications";
import { VaultState } from "@/hooks/useVault";
import { formatUsd, formatOz, formatRatio } from "@/utils/format";
import { TRAVEL_RULE_THRESHOLD, KYT_FLAG_THRESHOLD } from "@/utils/constants";
import { depositCollateral, mintXusd, burnXusd } from "@/services/anchorProgram";
import TravelRulePanel from "@/components/TravelRulePanel";
import { toast } from "sonner";

interface VaultDashboardProps {
  vault: VaultState;
  prices: { symbol: string; price: number; source: string }[];
}

const VaultDashboard = ({ vault, prices }: VaultDashboardProps) => {
  const { publicKey, signTransaction, connected } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? null;
  const isOnAllowlist = useProtocolStore((s) => s.isOnAllowlist(walletAddress));
  const addTransaction = useProtocolStore((s) => s.addTransaction);
  const addKytEvent = useProtocolStore((s) => s.addKytEvent);
  const transactions = useProtocolStore((s) => s.transactions);

  useVaultNotifications(vault, connected);

  const [depositOz, setDepositOz] = useState("");
  const [mintUsd, setMintUsd] = useState("");
  const [burnUsd, setBurnUsd] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const mintAmount = parseFloat(mintUsd) || 0;
  const showTravelRule = mintAmount >= TRAVEL_RULE_THRESHOLD;
  const xagPrice = prices.find((p) => p.symbol === "XAG/USD")?.price ?? 0;

  // Determine price source label
  const priceSource = prices.length > 0 ? prices[0].source : "SIX BFI";

  const recordAction = async (type: "deposit" | "mint" | "burn", amount: number, unit: string, txSig: string) => {
    await addTransaction({
      id: Date.now().toString(),
      type,
      amount,
      unit,
      txSignature: txSig,
      timestamp: new Date(),
      status: "confirmed",
      wallet: walletAddress ?? "unknown",
    });
    await addKytEvent({
      time: new Date(),
      action: type.toUpperCase(),
      amount: type === "deposit" ? `${amount}oz` : formatUsd(amount),
      asset: type === "deposit" ? "XAU" : "xUSD",
      flagged: amount >= KYT_FLAG_THRESHOLD,
      wallet: walletAddress ?? "unknown",
    });
  };

  const handleDeposit = async () => {
    if (!connected || !publicKey || !signTransaction) { toast.error("Connect your wallet first"); return; }
    const oz = parseFloat(depositOz);
    if (!oz || oz <= 0) return;
    setLoading("deposit");
    try {
      const result = await depositCollateral(publicKey, oz, signTransaction);
      if (result.success) {
        toast.success(`Deposited ${oz} oz XAU`, { description: `TX: ${result.txSignature?.slice(0, 12)}…` });
        await recordAction("deposit", oz, "oz XAU", result.txSignature ?? "");
        setDepositOz("");
      }
    } catch (err: any) {
      toast.error("Deposit failed", { description: err.message });
    } finally {
      setLoading(null);
    }
  };

  const handleMint = async () => {
    if (!connected || !publicKey || !signTransaction) { toast.error("Connect your wallet first"); return; }
    if (!mintAmount || mintAmount <= 0) return;
    setLoading("mint");
    try {
      const result = await mintXusd(publicKey, mintAmount, signTransaction);
      if (result.success) {
        toast.success(`Minted ${formatUsd(mintAmount)} xUSD`, { description: `TX: ${result.txSignature?.slice(0, 12)}…` });
        await recordAction("mint", mintAmount, "xUSD", result.txSignature ?? "");
        setMintUsd("");
      }
    } catch (err: any) {
      toast.error("Mint failed", { description: err.message });
    } finally {
      setLoading(null);
    }
  };

  const handleBurn = async () => {
    if (!connected || !publicKey || !signTransaction) { toast.error("Connect your wallet first"); return; }
    const usd = parseFloat(burnUsd);
    if (!usd || usd <= 0) return;
    setLoading("burn");
    try {
      const result = await burnXusd(publicKey, usd, signTransaction);
      if (result.success) {
        toast.success(`Burned ${formatUsd(usd)} xUSD`, { description: `TX: ${result.txSignature?.slice(0, 12)}…` });
        await recordAction("burn", usd, "xUSD", result.txSignature ?? "");
        setBurnUsd("");
      }
    } catch (err: any) {
      toast.error("Burn failed", { description: err.message });
    } finally {
      setLoading(null);
    }
  };

  const healthColor = vault.health === "healthy" || vault.health === "empty"
    ? "text-primary"
    : vault.health === "warning"
    ? "text-accent"
    : "text-destructive";

  return (
    <div className="space-y-4">
      {!connected && (
        <div className="text-xs tracking-wider text-center py-2 rounded border border-primary/40 text-primary/70 bg-primary/5">
          ⚠ CONNECT WALLET TO INTERACT WITH VAULT
        </div>
      )}

      {connected && !isOnAllowlist && <AllowlistRequestButton />}

      {connected && isOnAllowlist && (
        <div className="text-xs tracking-wider text-center py-2 rounded border border-primary/40 text-primary bg-primary/5">
          ✓ KYC VERIFIED — WALLET ON ALLOWLIST
        </div>
      )}

      {connected && !isOnAllowlist && (
        <div className="text-xs tracking-wider text-center py-2 rounded border border-destructive/40 text-destructive bg-destructive/5">
          ✗ KYC NOT VERIFIED — REQUEST ALLOWLIST ACCESS ABOVE
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Collateral" value={connected ? formatOz(vault.collateralOz) : "—"} sub={connected ? `≈${formatUsd(vault.collateralUsdValue)}` : "connect wallet"} />
        <MetricCard label="xUSD Minted" value={connected ? formatUsd(vault.xusdDebt) : "—"} sub={connected ? "outstanding" : "connect wallet"} />
        <MetricCard label="Collateral Ratio" value={connected ? formatRatio(vault.collateralRatio) : "—"} sub={connected ? vault.health.toUpperCase() : "connect wallet"} colorClass={healthColor} />
        <MetricCard label="Max Mintable" value={connected ? formatUsd(vault.maxMintable) : "—"} sub="at 150% ratio" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <RatioGauge ratio={connected ? vault.collateralRatio : 0} health={connected ? vault.health : "empty"} />

          <PriceHistoryChart currentPrice={vault.xauPriceUsd} />

          <ProtocolDiagram />

          {/* Deposit */}
          <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Deposit XAU Collateral</div>
            <div className="flex gap-2">
              <input type="number" placeholder="oz" value={depositOz} onChange={(e) => setDepositOz(e.target.value)} className="flex-1 bg-surface border border-card-border rounded px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              <button onClick={handleDeposit} disabled={loading === "deposit" || !connected || !isOnAllowlist} className="px-6 py-2 text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-30 transition-colors rounded tracking-wider font-medium">
                {loading === "deposit" ? "SENDING…" : "DEPOSIT →"}
              </button>
            </div>
          </div>

          {/* Mint */}
          <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Mint xUSD</div>
            <div className="flex gap-2">
              <input type="number" placeholder="USD" value={mintUsd} onChange={(e) => setMintUsd(e.target.value)} className="flex-1 bg-surface border border-card-border rounded px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              <button onClick={handleMint} disabled={showTravelRule || loading === "mint" || !connected || !isOnAllowlist} className="px-6 py-2 text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-30 transition-colors rounded tracking-wider font-medium">
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
              <button onClick={handleBurn} disabled={loading === "burn" || !connected || !isOnAllowlist} className="px-6 py-2 text-xs border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-30 transition-colors rounded tracking-wider font-medium">
                {loading === "burn" ? "SENDING…" : "BURN →"}
              </button>
            </div>
          </div>

          <TransactionHistoryPanel transactions={transactions} />
        </div>

        <div className="space-y-4">
          <ComplianceStatusPanel isKycVerified={isOnAllowlist} xauPrice={vault.xauPriceUsd} xagPrice={xagPrice} priceSource={priceSource} />
          <LiquidationMonitor />
          <KytEventsPanel />
        </div>
      </div>
    </div>
  );
};

export default VaultDashboard;
