import { useProtocolStore } from "@/stores/protocolStore";
import { formatTime } from "@/utils/format";

const KytEventsPanel = () => {
  const events = useProtocolStore((s) => s.kytEvents);

  return (
    <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
      <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Recent KYT Events</div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">No KYT events recorded yet</div>
        ) : (
          events.map((e, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{formatTime(e.time)}</span>
                <span className="text-foreground">{e.action} {e.amount} {e.asset}</span>
              </div>
              {e.flagged && (
                <span className="text-accent text-[10px] border border-accent/40 px-1.5 py-0.5 rounded">⚠ $10K+</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default KytEventsPanel;
