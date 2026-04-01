import { formatRatio } from "@/utils/format";

/**
 * Liquidation Monitor — shows a static explanation of the liquidation mechanism.
 * Real vault monitoring would require indexing all vaults on-chain
 * (not feasible from client without a backend indexer).
 */
const LiquidationMonitor = () => {
  return (
    <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] text-muted-foreground tracking-widest uppercase">Liquidation Monitor</div>
      </div>

      <div className="text-center py-4">
        <div className="text-primary text-xs tracking-wider mb-1">LIQUIDATION PARAMETERS</div>
        <div className="text-[10px] text-muted-foreground">
          Vaults below 120% collateral ratio are eligible for liquidation.
          Anyone can call the <code className="text-primary">liquidate</code> instruction.
        </div>
      </div>

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
