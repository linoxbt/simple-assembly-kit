import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useProtocolStore } from "@/stores/protocolStore";
import { AML_REASONS, AmlReason } from "@/utils/constants";
import { shortenAddress } from "@/utils/format";
import { toast } from "sonner";

const AdminPanel = () => {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? "";

  const {
    adminWallets, addAdmin, removeAdmin,
    allowlist, addToAllowlist, removeFromAllowlist,
    allowlistRequests, approveRequest, rejectRequest,
    amlScores, setAmlScore,
  } = useProtocolStore();

  const [newAddress, setNewAddress] = useState("");
  const [newAdminAddress, setNewAdminAddress] = useState("");
  const [amlAddress, setAmlAddress] = useState("");
  const [amlScoreVal, setAmlScoreVal] = useState(25);
  const [amlReason, setAmlReason] = useState<AmlReason>("CLEAN");

  const riskLevel = amlScoreVal <= 30 ? "LOW" : amlScoreVal <= 70 ? "MEDIUM" : "HIGH — BLOCKED";
  const riskColor = amlScoreVal <= 30 ? "text-success" : amlScoreVal <= 70 ? "text-warning" : "text-destructive";
  const riskBorderColor = amlScoreVal <= 30 ? "border-success text-success hover:bg-success" : amlScoreVal <= 70 ? "border-warning text-warning hover:bg-warning" : "border-destructive text-destructive hover:bg-destructive";

  const pendingRequests = allowlistRequests.filter((r) => r.status === "pending");

  const handleAddToAllowlist = () => {
    if (newAddress.trim()) {
      addToAllowlist(newAddress.trim());
      setNewAddress("");
      toast.success("Address added to AllowList");
    }
  };

  const handleAddAdmin = () => {
    if (newAdminAddress.trim()) {
      addAdmin(newAdminAddress.trim());
      setNewAdminAddress("");
      toast.success("Admin wallet added");
    }
  };

  return (
    <div className="space-y-4">
      {/* Allowlist Requests */}
      {pendingRequests.length > 0 && (
        <div className="bg-card border border-warning/30 rounded-lg p-4 card-glow">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] text-warning tracking-widest uppercase">
              Pending KYC Requests
            </div>
            <span className="text-[10px] px-2 py-0.5 border border-warning text-warning rounded">
              {pendingRequests.length}
            </span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {pendingRequests.map((req) => (
              <div key={req.wallet} className="flex items-center justify-between bg-surface rounded px-3 py-2 text-xs">
                <span className="text-foreground font-mono">{shortenAddress(req.wallet, 6)}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { approveRequest(req.wallet); toast.success(`Approved ${shortenAddress(req.wallet)}`); }}
                    className="text-success hover:underline text-[10px] tracking-wider"
                  >
                    APPROVE
                  </button>
                  <button
                    onClick={() => { rejectRequest(req.wallet); toast.success(`Rejected ${shortenAddress(req.wallet)}`); }}
                    className="text-destructive hover:underline text-[10px] tracking-wider"
                  >
                    REJECT
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Admin Management */}
        <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase">Admin Wallet Management</div>
            <span className="text-[10px] text-muted-foreground">{adminWallets.length} admins</span>
          </div>

          <div className="flex gap-2 mb-4">
            <input
              placeholder="Wallet address"
              value={newAdminAddress}
              onChange={(e) => setNewAdminAddress(e.target.value)}
              className="flex-1 bg-surface border border-card-border rounded px-3 py-2 text-xs text-foreground focus:border-info focus:outline-none"
            />
            <button onClick={handleAddAdmin} className="px-4 py-2 text-xs border border-info text-info hover:bg-info hover:text-info-foreground transition-colors rounded tracking-wider font-medium">
              ADD ADMIN +
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {adminWallets.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-3">No admins yet</div>
            ) : (
              adminWallets.map((addr) => (
                <div key={addr} className="flex items-center justify-between bg-surface rounded px-3 py-2 text-xs">
                  <span className="text-foreground font-mono">{shortenAddress(addr, 6)}</span>
                  <div className="flex items-center gap-2">
                    {addr === walletAddress && <span className="text-info text-[10px]">YOU</span>}
                    <button
                      onClick={() => { removeAdmin(addr); toast.success("Admin removed"); }}
                      disabled={addr === walletAddress}
                      className="text-destructive hover:underline text-[10px] tracking-wider disabled:opacity-30"
                    >
                      REMOVE
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* KYC Allowlist */}
        <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase">KYC Allowlist Management</div>
            <span className="text-[10px] text-muted-foreground">{allowlist.length} members</span>
          </div>

          <div className="flex gap-2 mb-4">
            <input
              placeholder="Wallet address"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="flex-1 bg-surface border border-card-border rounded px-3 py-2 text-xs text-foreground focus:border-success focus:outline-none"
            />
            <button onClick={handleAddToAllowlist} className="px-4 py-2 text-xs border border-success text-success hover:bg-success hover:text-success-foreground transition-colors rounded tracking-wider font-medium">
              ADD +
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {allowlist.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-3">No wallets on allowlist</div>
            ) : (
              allowlist.map((addr) => (
                <div key={addr} className="flex items-center justify-between bg-surface rounded px-3 py-2 text-xs">
                  <span className="text-foreground font-mono">{shortenAddress(addr, 6)}</span>
                  <button onClick={() => { removeFromAllowlist(addr); toast.success("Address removed from AllowList"); }} className="text-destructive hover:underline text-[10px] tracking-wider">
                    REVOKE
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
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
              <span className={`font-semibold ${riskColor}`}>{amlScoreVal}/100 — {riskLevel}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={amlScoreVal}
              onChange={(e) => setAmlScoreVal(parseInt(e.target.value))}
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
            onClick={() => {
              if (!amlAddress.trim()) { toast.error("Enter a wallet address"); return; }
              setAmlScore(amlAddress.trim(), amlScoreVal, amlReason);
              toast.success(`AML score set: ${amlScoreVal}/100 for ${shortenAddress(amlAddress)}`);
            }}
            className={`w-full py-2 text-xs border ${riskBorderColor} hover:text-primary-foreground transition-colors rounded tracking-wider font-medium`}
          >
            SET SCORE
          </button>
        </div>

        {/* AML Scores List */}
        <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-4">Active AML Scores</div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.keys(amlScores).length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-3">No AML scores recorded</div>
            ) : (
              Object.entries(amlScores).map(([wallet, data]) => (
                <div key={wallet} className="flex items-center justify-between bg-surface rounded px-3 py-2 text-xs">
                  <span className="text-foreground font-mono">{shortenAddress(wallet, 6)}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${data.score <= 30 ? "text-success" : data.score <= 70 ? "text-warning" : "text-destructive"}`}>
                      {data.score}/100
                    </span>
                    <span className="text-muted-foreground text-[10px]">{data.reason.replace(/_/g, " ")}</span>
                  </div>
                </div>
              ))
            )}
          </div>
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

      {/* Request History */}
      {allowlistRequests.length > 0 && (
        <div className="bg-card border border-card-border rounded-lg p-4 card-glow overflow-x-auto">
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Request History</div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {allowlistRequests.map((req) => (
              <div key={req.wallet} className="flex items-center justify-between bg-surface rounded px-3 py-2 text-xs">
                <span className="text-foreground font-mono">{shortenAddress(req.wallet, 6)}</span>
                <span className={
                  req.status === "approved" ? "text-success" :
                  req.status === "rejected" ? "text-destructive" :
                  "text-warning"
                }>
                  {req.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
