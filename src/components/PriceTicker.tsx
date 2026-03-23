import { formatUsd } from "@/utils/format";

interface PriceTickerProps {
  prices: { symbol: string; price: number; source: string }[];
}

const PriceTicker = ({ prices }: PriceTickerProps) => {
  const items = [...prices, ...prices]; // duplicate for seamless loop

  return (
    <div className="w-full overflow-hidden bg-surface border-b border-card-border">
      <div className="ticker-animate flex whitespace-nowrap py-1.5">
        {items.map((p, i) => (
          <span key={i} className="mx-6 text-xs tracking-wider">
            <span className="text-muted-foreground">{p.symbol}</span>
            <span className="ml-2 text-primary gold-glow font-semibold">{formatUsd(p.price)}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default PriceTicker;
