import { formatRatio } from "@/utils/format";
import { HealthStatus } from "@/utils/constants";

interface RatioGaugeProps {
  ratio: number;
  health: HealthStatus;
}

const healthColors: Record<HealthStatus, string> = {
  healthy: "text-primary",
  warning: "text-accent",
  danger: "text-destructive",
  liquidated: "text-destructive",
  empty: "text-muted-foreground",
};

const RatioGauge = ({ ratio, health }: RatioGaugeProps) => {
  const clampedRatio = Math.min(ratio, 300);
  const percentage = (clampedRatio / 300) * 100;

  return (
    <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
      <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">RATIO GAUGE</div>
      <div className={`text-2xl font-bold mb-3 ${healthColors[health]}`}>
        {formatRatio(ratio)} <span className="text-sm uppercase">{health}</span>
      </div>
      <div className="relative h-3 rounded-full overflow-hidden bg-muted">
        <div className="gauge-bar absolute inset-0 rounded-full" />
        <div className="absolute top-0 bottom-0 w-0.5 bg-foreground z-10" style={{ left: `${percentage}%` }} />
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
        <span>0%</span>
        <span className="text-destructive">120% LIQ</span>
        <span className="text-accent">150% MINT</span>
        <span className="text-primary">200% SAFE</span>
        <span>300%</span>
      </div>
    </div>
  );
};

export default RatioGauge;
