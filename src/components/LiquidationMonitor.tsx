import { useProtocolStore } from "@/stores/protocolStore";
import { formatRatio, shortenAddress } from "@/utils/format";

const LiquidationMonitor = () => {
  const vaults = useProtocolStore((s) => s.vaults);

  // Sort by ratio ascending (most at-risk first), filter those below 200%
  const atRiskVaults = vaults
    .filter((v) => v.collateralRatio < 200 && v.collateralRatio > 0)
    .sort((a, b) => a.collateralRatio - b.collateralRatio);

  const getHealthColor = (ratio: number) => {
    if (ratio <= 120) return "text-destructive";
    if (ratio <= 150) return "text-warning";
    return "text-success";
  };

  const getBarWidth = (ratio: number) => {
    return Math.min((ratio / 200) * 100, 100);
  };

  const estimateTimeToLiquidation = (ratio: number) => {
    if (ratio <= 120) return "LIQUIDATABLE NOW";
    // Rough estimate assuming 2% price drop per hour
    const pctToLiq = ratio - 120;
    const hoursEstimate = pctToLiq / 2;
    if (hoursEstimate < 1) return `~${Math.round(hoursEstimate * 60)}m at -2%/hr`;
    return `~${hoursEstimate.toFixed(1)}h at -2%/hr`;
  };

  return (
    <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] text-muted-foreground tracking-widest uppercase">
          Liquidation Monitor
        </div>
        <span className="text-[10px] text-muted-foreground">
          {atRiskVaults.length} at risk
        </span>
      </div>

      {atRiskVaults.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-success text-xs tracking-wider mb-1">✓ ALL VAULTS HEALTHY</div>
          <div className="text-[10px] text-muted-foreground">
            No vaults approaching the 120% liquidation threshold
          </div>
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {atRiskVaults.map((vault) => (
            <div
              key={vault.wallet}
              className="bg-surface rounded-lg p-3 border border-card-border"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-foreground">
                  {shortenAddress(vault.wallet)}
                </span>
                <span className={`text-xs font-semibold ${getHealthColor(vault.collateralRatio)}`}>
                  {formatRatio(vault.collateralRatio)}
                </span>
              </div>

              <div className="relative h-1.5 rounded-full overflow-hidden bg-muted mb-2">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                    vault.collateralRatio <= 120
                      ? "bg-destructive"
                      : vault.collateralRatio <= 150
                      ? "bg-warning"
                      : "bg-success"
                  }`}
                  style={{ width: `${getBarWidth(vault.collateralRatio)}%` }}
                />
                {/* 120% marker */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-destructive/60"
                  style={{ left: "60%" }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>
                  {vault.collateralOz.toFixed(2)} oz · {vault.xusdDebt.toFixed(0)} xUSD
                </span>
                <span className={getHealthColor(vault.collateralRatio)}>
                  {estimateTimeToLiquidation(vault.collateralRatio)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-card-border">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>120% = LIQUIDATION</span>
          <span>150% = MIN MINT</span>
          <span>200% = SAFE</span>
        </div>
      </div>
    </div>
  );
};

export default LiquidationMonitor;
