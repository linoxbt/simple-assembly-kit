import { useState } from "react";
import { formatUsd, formatOz } from "@/utils/format";
import { SOLANA_NETWORK } from "@/utils/constants";
import { TransactionRecord } from "@/stores/protocolStore";

const explorerUrl = (sig: string) =>
  sig.startsWith("mock_") ? "#" : `https://explorer.solana.com/tx/${sig}?cluster=${SOLANA_NETWORK}`;

const typeLabels: Record<string, string> = { deposit: "DEPOSIT", mint: "MINT", burn: "BURN" };

interface Props {
  transactions?: TransactionRecord[];
}

const TransactionHistoryPanel = ({ transactions = [] }: Props) => {
  const [filter, setFilter] = useState<"all" | "deposit" | "mint" | "burn">("all");
  const filtered = filter === "all" ? transactions : transactions.filter((t) => t.type === filter);

  const formatTime = (d: Date) => {
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] text-muted-foreground tracking-widest uppercase">Transaction History</div>
        <div className="flex gap-1">
          {(["all", "deposit", "mint", "burn"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 text-[10px] tracking-wider rounded border transition-colors ${
                filter === f
                  ? "border-primary text-primary bg-primary/10"
                  : "border-card-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            {transactions.length === 0 ? "No transactions yet — deposit, mint, or burn to see history" : "No transactions found"}
          </div>
        ) : (
          filtered.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between text-xs py-1.5 border-b border-card-border last:border-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-primary">{typeLabels[tx.type]}</span>
                <span className="text-foreground">{tx.type === "deposit" ? formatOz(tx.amount) : formatUsd(tx.amount)}</span>
                <span className="text-muted-foreground">{tx.unit}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] ${tx.status === "confirmed" ? "text-primary" : tx.status === "pending" ? "text-accent" : "text-destructive"}`}>
                  {tx.status === "confirmed" ? "✓" : tx.status === "pending" ? "◌" : "✗"}
                </span>
                <span className="text-muted-foreground">{formatTime(tx.timestamp)}</span>
                <a href={explorerUrl(tx.txSignature)} target="_blank" rel="noopener noreferrer" className="text-primary/70 hover:underline text-[10px] tracking-wider" title={tx.txSignature}>
                  {tx.txSignature.startsWith("mock_") ? "MOCK" : `${tx.txSignature.slice(0, 8)}…`}
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TransactionHistoryPanel;
