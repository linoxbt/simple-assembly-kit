import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface PricePoint {
  time: string;
  price: number;
}

interface PriceHistoryChartProps {
  currentPrice: number;
}

const PriceHistoryChart = ({ currentPrice }: PriceHistoryChartProps) => {
  const [history, setHistory] = useState<PricePoint[]>([]);
  const basePrice = useRef(currentPrice || 2345);

  useEffect(() => {
    if (currentPrice > 0) basePrice.current = currentPrice;
  }, [currentPrice]);

  useEffect(() => {
    // Seed initial history
    const now = Date.now();
    const initial: PricePoint[] = [];
    for (let i = 24; i >= 0; i--) {
      const t = now - i * 60_000 * 60;
      const drift = (Math.random() - 0.5) * basePrice.current * 0.02;
      initial.push({
        time: new Date(t).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
        price: Math.round((basePrice.current + drift) * 100) / 100,
      });
    }
    setHistory(initial);

    // Add new point every 15s
    const iv = setInterval(() => {
      setHistory((prev) => {
        const last = prev[prev.length - 1]?.price ?? basePrice.current;
        const drift = (Math.random() - 0.5) * last * 0.003;
        const next: PricePoint = {
          time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
          price: Math.round((last + drift) * 100) / 100,
        };
        return [...prev.slice(-48), next];
      });
    }, 15_000);

    return () => clearInterval(iv);
  }, []);

  const prices = history.map((h) => h.price);
  const min = Math.min(...prices) * 0.999;
  const max = Math.max(...prices) * 1.001;

  return (
    <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] text-muted-foreground tracking-widest uppercase">XAU/USD Price History</div>
        <span className="text-xs text-primary font-semibold gold-glow">
          ${currentPrice.toFixed(2)}
        </span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[min, max]}
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v.toFixed(0)}`}
              width={50}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                fontSize: "11px",
                color: "hsl(var(--foreground))",
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, "XAU/USD"]}
            />
            <ReferenceLine y={currentPrice} stroke="hsl(var(--primary))" strokeDasharray="3 3" strokeOpacity={0.4} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: "hsl(var(--primary))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PriceHistoryChart;
