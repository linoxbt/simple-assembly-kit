import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface PricePoint {
  time: string;
  price: number;
  source: string;
}

interface PriceHistoryChartProps {
  currentPrice: number;
}

const PriceHistoryChart = ({ currentPrice }: PriceHistoryChartProps) => {
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("price_history")
        .select("price, source, created_at")
        .eq("asset", "XAU/USD")
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        setHistory(
          data.map((row: any) => ({
            time: new Date(row.created_at).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
            price: Number(row.price),
            source: row.source,
          }))
        );
      }
    } catch (err) {
      console.warn("Failed to fetch price history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    const iv = setInterval(fetchHistory, 30_000);
    return () => clearInterval(iv);
  }, []);

  // Subscribe to realtime inserts
  useEffect(() => {
    const channel = supabase
      .channel("price_history_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "price_history" },
        (payload) => {
          const row = payload.new as any;
          if (row.asset === "XAU/USD") {
            setHistory((prev) => [
              ...prev.slice(-99),
              {
                time: new Date(row.created_at).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }),
                price: Number(row.price),
                source: row.source,
              },
            ]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
        <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">XAU/USD Price History</div>
        <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">Loading price history…</div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
        <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">XAU/USD Price History</div>
        <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
          No price data yet. The keeper will populate this automatically.
        </div>
      </div>
    );
  }

  const prices = history.map((h) => h.price);
  const min = Math.min(...prices) * 0.999;
  const max = Math.max(...prices) * 1.001;
  const latestSource = history[history.length - 1]?.source ?? "—";

  return (
    <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] text-muted-foreground tracking-widest uppercase">
          XAU/USD Price History
          <span className="ml-2 text-[9px] opacity-60">via {latestSource}</span>
        </div>
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
