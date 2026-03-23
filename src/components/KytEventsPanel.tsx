import { useState } from "react";
import { formatTime } from "@/utils/format";

interface KytEvent {
  time: Date;
  action: string;
  amount: string;
  asset: string;
  flagged: boolean;
}

const MOCK_EVENTS: KytEvent[] = [
  { time: new Date(), action: "MINT", amount: "$5,000", asset: "xUSD", flagged: false },
  { time: new Date(Date.now() - 180_000), action: "DEPOSIT", amount: "5oz", asset: "XAU", flagged: false },
];

const KytEventsPanel = () => {
  const [events] = useState<KytEvent[]>(MOCK_EVENTS);

  return (
    <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
      <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Recent KYT Events</div>
      <div className="space-y-2">
        {events.map((e, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">{formatTime(e.time)}</span>
              <span className="text-foreground">{e.action} {e.amount} {e.asset}</span>
            </div>
            {e.flagged && (
              <span className="text-warning text-[10px] border border-warning px-1.5 py-0.5 rounded">⚠ FLAGGED $10K+</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default KytEventsPanel;
