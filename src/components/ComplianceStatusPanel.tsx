import { formatUsd } from "@/utils/format";

interface ComplianceStatusPanelProps {
  isKycVerified: boolean;
  xauPrice: number;
  xagPrice: number;
  priceSource: string;
}

const ComplianceStatusPanel = ({ isKycVerified, xauPrice, xagPrice, priceSource }: ComplianceStatusPanelProps) => {
  const items = [
    { label: "KYC", verified: isKycVerified },
    { label: "AML", verified: true },
    { label: "KYT", verified: true, text: "ACTIVE" },
    { label: "Travel Rule", verified: true, text: "ACTIVE" },
  ];

  return (
    <div className="bg-card border border-card-border rounded-lg p-4 card-glow space-y-4">
      <div className="text-[10px] text-muted-foreground tracking-widest uppercase">Compliance Status</div>

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{item.label}</span>
            <span className={item.verified ? "text-primary" : "text-destructive"}>
              {item.text || (item.verified ? "VERIFIED" : "NOT VERIFIED")}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-card-border pt-3">
        <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-2">Oracle Status</div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">XAU</span>
            <span>
              <span className="text-primary">{formatUsd(xauPrice)}</span>
              <span className="text-primary/70 ml-2 text-[10px]">{priceSource} LIVE</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">XAG</span>
            <span>
              <span className="text-primary">{formatUsd(xagPrice)}</span>
              <span className="text-primary/70 ml-2 text-[10px]">{priceSource} LIVE</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceStatusPanel;
