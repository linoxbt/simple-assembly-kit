interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  colorClass?: string;
}

const MetricCard = ({ label, value, sub, colorClass = "text-primary" }: MetricCardProps) => {
  return (
    <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
      <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-2">{label}</div>
      <div className={`text-lg font-bold ${colorClass}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
};

export default MetricCard;
