const ProtocolDiagram = () => {
  return (
    <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
      <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-4">
        Protocol Architecture
      </div>

      <div className="space-y-3">
        {/* Flow steps */}
        <div className="grid grid-cols-1 gap-2">
          <Step
            number="1"
            title="DEPOSIT XAU"
            description="Lock tokenised gold collateral in your vault"
            color="text-primary"
            borderColor="border-primary/30"
          />
          <Arrow />
          <Step
            number="2"
            title="PRICE CHECK"
            description="Oracle verifies XAU/USD via Pyth / SIX BFI"
            color="text-info"
            borderColor="border-info/30"
          />
          <Arrow />
          <Step
            number="3"
            title="COMPLIANCE GATE"
            description="KYC allowlist · AML score < 70 · KYT logging"
            color="text-purple"
            borderColor="border-purple/30"
          />
          <Arrow />
          <Step
            number="4"
            title="MINT xUSD"
            description="Borrow up to 66% of collateral value as stablecoin"
            color="text-success"
            borderColor="border-success/30"
          />
          <Arrow />
          <Step
            number="5"
            title="BURN xUSD"
            description="Return stablecoin to reclaim your gold collateral"
            color="text-destructive"
            borderColor="border-destructive/30"
          />
        </div>

        {/* Key ratios */}
        <div className="border-t border-card-border pt-3 mt-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-surface rounded p-2 border border-card-border">
              <div className="text-success text-sm font-bold">150%</div>
              <div className="text-[9px] text-muted-foreground tracking-wider">MIN COLLATERAL</div>
            </div>
            <div className="bg-surface rounded p-2 border border-card-border">
              <div className="text-destructive text-sm font-bold">120%</div>
              <div className="text-[9px] text-muted-foreground tracking-wider">LIQUIDATION</div>
            </div>
            <div className="bg-surface rounded p-2 border border-card-border">
              <div className="text-warning text-sm font-bold">5%</div>
              <div className="text-[9px] text-muted-foreground tracking-wider">LIQ BONUS</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Step = ({
  number,
  title,
  description,
  color,
  borderColor,
}: {
  number: string;
  title: string;
  description: string;
  color: string;
  borderColor: string;
}) => (
  <div className={`flex items-start gap-3 bg-surface rounded-lg p-3 border ${borderColor}`}>
    <span className={`${color} font-bold text-sm flex-shrink-0`}>{number}</span>
    <div>
      <div className={`text-xs font-semibold tracking-wider ${color}`}>{title}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{description}</div>
    </div>
  </div>
);

const Arrow = () => (
  <div className="flex justify-center">
    <span className="text-muted-foreground text-xs">↓</span>
  </div>
);

export default ProtocolDiagram;
