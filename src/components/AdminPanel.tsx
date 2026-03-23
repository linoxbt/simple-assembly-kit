import { useState } from "react";
import { AML_REASONS, AmlReason } from "@/utils/constants";
import { shortenAddress } from "@/utils/format";
import { toast } from "sonner";

const MOCK_MEMBERS = [
  "7xKX...mP3q",
  "4dRY...nW2k",
  "9pLM...hJ5f",
];

const AdminPanel = () => {
  const [newAddress, setNewAddress] = useState("");
  const [members, setMembers] = useState(MOCK_MEMBERS);
  const [amlAddress, setAmlAddress] = useState("");
  const [amlScore, setAmlScore] = useState(25);
  const [amlReason, setAmlReason] = useState<AmlReason>("CLEAN");

  const riskLevel = amlScore <= 30 ? "LOW" : amlScore <= 70 ? "MEDIUM" : "HIGH — BLOCKED";
  const riskColor = amlScore <= 30 ? "text-success" : amlScore <= 70 ? "text-warning" : "text-destructive";
  const riskBorderColor = amlScore <= 30 ? "border-success text-success hover:bg-success" : amlScore <= 70 ? "border-warning text-warning hover:bg-warning" : "border-destructive text-destructive hover:bg-destructive";

  const handleAdd = () => {
    if (newAddress.trim()) {
      setMembers([...members, shortenAddress(newAddress)]);
      setNewAddress("");
      toast.success("Address added to AllowList");
    }
  };

  const handleRevoke = (addr: string) => {
    setMembers(members.filter((m) => m !== addr));
    toast.success("Address removed from AllowList");
  };

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        {/* KYC Allowlist */}
        <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase">KYC Allowlist Management</div>
            <span className="text-[10px] text-muted-foreground">{members.length} members</span>
          </div>

          <div className="flex gap-2 mb-4">
            <input
              placeholder="Wallet address"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="flex-1 bg-surface border border-card-border rounded px-3 py-2 text-xs text-foreground focus:border-success focus:outline-none"
            />
            <button onClick={handleAdd} className="px-4 py-2 text-xs border border-success text-success hover:bg-success hover:text-success-foreground transition-colors rounded tracking-wider font-medium">
              ADD +
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {members.map((addr) => (
              <div key={addr} className="flex items-center justify-between bg-surface rounded px-3 py-2 text-xs">
                <span className="text-foreground font-mono">{addr}</span>
                <button onClick={() => handleRevoke(addr)} className="text-destructive hover:underline text-[10px] tracking-wider">
                  REVOKE
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* AML Risk Scoring */}
        <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-4">AML Risk Scoring</div>

          <input
            placeholder="Wallet address"
            value={amlAddress}
            onChange={(e) => setAmlAddress(e.target.value)}
            className="w-full bg-surface border border-card-border rounded px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none mb-4"
          />

          <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Risk Score</span>
              <span className={`font-semibold ${riskColor}`}>{amlScore}/100 — {riskLevel}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={amlScore}
              onChange={(e) => setAmlScore(parseInt(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span className="text-success">0</span>
              <span className="text-warning">50</span>
              <span className="text-destructive">100</span>
            </div>
          </div>

          <select
            value={amlReason}
            onChange={(e) => setAmlReason(e.target.value as AmlReason)}
            className="w-full bg-surface border border-card-border rounded px-3 py-2 text-xs text-foreground mb-4 focus:outline-none"
          >
            {AML_REASONS.map((r) => (
              <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
            ))}
          </select>

          <button
            onClick={() => toast.success(`AML score set: ${amlScore}/100`)}
            className={`w-full py-2 text-xs border ${riskBorderColor} hover:text-primary-foreground transition-colors rounded tracking-wider font-medium`}
          >
            SET SCORE
          </button>
        </div>
      </div>

      {/* Compliance Matrix */}
      <div className="bg-card border border-card-border rounded-lg p-4 card-glow overflow-x-auto">
        <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Compliance Matrix</div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-card-border text-muted-foreground">
              <th className="text-left py-2 pr-4">Pillar</th>
              <th className="text-left py-2 pr-4">Threshold</th>
              <th className="text-left py-2">Enforcement</th>
            </tr>
          </thead>
          <tbody className="text-foreground">
            <tr className="border-b border-card-border/50">
              <td className="py-2 pr-4">KYC</td>
              <td className="py-2 pr-4">All transactions</td>
              <td className="py-2">Block if not on AllowList PDA</td>
            </tr>
            <tr className="border-b border-card-border/50">
              <td className="py-2 pr-4">AML</td>
              <td className="py-2 pr-4">Score &gt;70/100</td>
              <td className="py-2">Block at instruction level</td>
            </tr>
            <tr className="border-b border-card-border/50">
              <td className="py-2 pr-4">KYT</td>
              <td className="py-2 pr-4">All txns, flag $10k</td>
              <td className="py-2">Emit KytEvent on-chain</td>
            </tr>
            <tr>
              <td className="py-2 pr-4">Travel Rule</td>
              <td className="py-2 pr-4">Transfers ≥$3,000</td>
              <td className="py-2">Require VASP fields + PDA record</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPanel;
