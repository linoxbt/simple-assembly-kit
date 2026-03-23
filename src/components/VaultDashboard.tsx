import { useState } from "react";
import MetricCard from "@/components/MetricCard";
import RatioGauge from "@/components/RatioGauge";
import ComplianceStatusPanel from "@/components/ComplianceStatusPanel";
import TravelRulePanel from "@/components/TravelRulePanel";
import KytEventsPanel from "@/components/KytEventsPanel";
import { VaultState, PriceData } from "@/hooks/useVault";
import { formatUsd, formatOz, formatRatio } from "@/utils/format";
import { TRAVEL_RULE_THRESHOLD } from "@/utils/constants";
import { toast } from "sonner";

interface VaultDashboardProps {
  vault: VaultState;
  prices: PriceData[];
}

const VaultDashboard = ({ vault, prices }: VaultDashboardProps) => {
  const [depositOz, setDepositOz] = useState("");
  const [mintUsd, setMintUsd] = useState("");
  const [burnUsd, setBurnUsd] = useState("");

  const mintAmount = parseFloat(mintUsd) || 0;
  const showTravelRule = mintAmount >= TRAVEL_RULE_THRESHOLD;

  const xagPrice = prices.find((p) => p.symbol === "XAG/USD")?.price ?? 0;

  const handleDeposit = () => {
    toast.success(`Depositing ${depositOz} oz XAU collateral`);
    setDepositOz("");
  };
  const handleMint = () => {
    toast.success(`Minting ${formatUsd(mintAmount)} xUSD`);
    setMintUsd("");
  };
  const handleBurn = () => {
    toast.success(`Burning ${burnUsd} xUSD & reclaiming collateral`);
    setBurnUsd("");
  };

  return (
    <div className="space-y-4">
      {/* KYC Banner */}
      <div className={`text-xs tracking-wider text-center py-2 rounded border ${
        vault.isKycVerified
          ? "border-success text-success bg-success/5"
          : "border-destructive text-destructive bg-destructive/5"
      }`}>
        {vault.isKycVerified ? "✓ KYC VERIFIED — WALLET ON ALLOWLIST" : "✗ KYC NOT VERIFIED — ADD WALLET VIA ADMIN PANEL"}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Collateral" value={formatOz(vault.collateralOz)} sub={`≈${formatUsd(vault.collateralUsdValue)}`} colorClass="text-primary gold-glow" />
        <MetricCard label="xUSD Minted" value={formatUsd(vault.xusdDebt)} sub="outstanding" colorClass="text-success" />
        <MetricCard
          label="Collateral Ratio"
          value={`${formatRatio(vault.collateralRatio)}`}
          sub={vault.health.toUpperCase()}
          colorClass={vault.health === "healthy" ? "text-success" : vault.health === "warning" ? "text-warning" : "text-destructive"}
        />
        <MetricCard label="Max Mintable" value={formatUsd(vault.maxMintable)} sub="at 150% ratio" />
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left Column — Actions */}
        <div className="lg:col-span-2 space-y-4">
          <RatioGauge ratio={vault.collateralRatio} health={vault.health} />

          {/* Deposit */}
          <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Deposit XAU Collateral</div>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="oz"
                value={depositOz}
                onChange={(e) => setDepositOz(e.target.value)}
                className="flex-1 bg-surface border border-card-border rounded px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
              <button onClick={handleDeposit} className="px-6 py-2 text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors rounded tracking-wider font-medium">
                DEPOSIT →
              </button>
            </div>
          </div>

          {/* Mint */}
          <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Mint xUSD</div>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="USD"
                value={mintUsd}
                onChange={(e) => setMintUsd(e.target.value)}
                className="flex-1 bg-surface border border-card-border rounded px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
              <button onClick={handleMint} disabled={showTravelRule} className="px-6 py-2 text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-30 transition-colors rounded tracking-wider font-medium">
                MINT →
              </button>
            </div>
            {showTravelRule && (
              <div className="mt-3">
                <TravelRulePanel amount={mintAmount} onSubmit={() => { handleMint(); }} />
              </div>
            )}
          </div>

          {/* Burn */}
          <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Burn xUSD / Reclaim Collateral</div>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="xUSD"
                value={burnUsd}
                onChange={(e) => setBurnUsd(e.target.value)}
                className="flex-1 bg-surface border border-card-border rounded px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
              <button onClick={handleBurn} className="px-6 py-2 text-xs border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors rounded tracking-wider font-medium">
                BURN →
              </button>
            </div>
          </div>
        </div>

        {/* Right Column — Status */}
        <div className="space-y-4">
          <ComplianceStatusPanel
            isKycVerified={vault.isKycVerified}
            xauPrice={vault.xauPriceUsd}
            xagPrice={xagPrice}
            priceSource={vault.priceFromSix ? "SIX BFI" : "Pyth"}
          />
          <KytEventsPanel />
        </div>
      </div>
    </div>
  );
};

export default VaultDashboard;
