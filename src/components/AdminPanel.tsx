import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useProtocolStore } from "@/stores/protocolStore";
import {
  addToAllowlistOnChain,
  removeFromAllowlistOnChain,
  fetchAllowlistAccount,
  parseProgramError,
} from "@/services/anchorProgram";
import { AML_REASONS, AmlReason } from "@/utils/constants";
import { shortenAddress } from "@/utils/format";
import { toast } from "sonner";

const AdminPanel = () => {
  const { publicKey, signTransaction } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? "";
  const isAdmin = useProtocolStore((s) => s.isAdmin(walletAddress));

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
  const [loading, setLoading] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [onChainMembers, setOnChainMembers] = useState<string[]>([]);

  // Guard: only admins can see this panel
  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <div className="text-xs tracking-widest text-destructive uppercase">⚠ ACCESS DENIED</div>
        <p className="text-sm text-muted-foreground mt-2">Only admin wallets can access this dashboard.</p>
      </div>
    );
  }

  const refreshOnChainAllowlist = async () => {
    const data = await fetchAllowlistAccount();
    if (data) {
      setOnChainMembers(data.members.map((m) => m.toBase58()));
    }
  };

  const handleAddToAllowlistOnChain = async () => {
    if (!newAddress.trim() || !publicKey || !signTransaction) return;
    setLoading("add-allowlist");
    setTxStatus("Waiting for wallet approval...");
    try {
      const memberPk = new PublicKey(newAddress.trim());
      const result = await addToAllowlistOnChain(publicKey, memberPk, signTransaction);
      if (result.success) {
        setTxStatus(`Confirmed ✓ tx: ${result.txSignature?.slice(0, 8)}...`);
        toast.success(`Added ${shortenAddress(newAddress)} to on-chain allowlist`);
        // Also save to database
        await addToAllowlist(newAddress.trim(), walletAddress);
        setNewAddress("");
        refreshOnChainAllowlist();
      } else {
        setTxStatus(`Error: ${result.error}`);
        toast.error("Failed", { description: result.error });
      }
    } catch (err: any) {
      const msg = parseProgramError(err);
      setTxStatus(`Error: ${msg}`);
      toast.error("Failed", { description: msg });
    } finally {
      setLoading(null);
    }
  };

  const handleRemoveFromAllowlistOnChain = async (addr: string) => {
    if (!publicKey || !signTransaction) return;
    setLoading(`remove-${addr}`);
    try {
      const memberPk = new PublicKey(addr);
      const result = await removeFromAllowlistOnChain(publicKey, memberPk, signTransaction);
      if (result.success) {
        toast.success(`Removed ${shortenAddress(addr)} from on-chain allowlist`);
        await removeFromAllowlist(addr);
        refreshOnChainAllowlist();
      } else {
        toast.error("Failed", { description: result.error });
      }
    } catch (err: any) {
      toast.error("Failed", { description: parseProgramError(err) });
    } finally {
      setLoading(null);
    }
  };

  const handleApproveRequest = async (wallet: string) => {
    if (!publicKey || !signTransaction) return;
    setLoading(`approve-${wallet}`);
    try {
      const memberPk = new PublicKey(wallet);
      const result = await addToAllowlistOnChain(publicKey, memberPk, signTransaction);
      if (result.success) {
        await approveRequest(wallet);
        toast.success(`Approved & added ${shortenAddress(wallet)} on-chain`);
        refreshOnChainAllowlist();
      } else {
        toast.error("On-chain tx failed", { description: result.error });
      }
    } catch (err: any) {
      toast.error("Failed", { description: parseProgramError(err) });
    } finally {
      setLoading(null);
    }
  };

  const riskLabel = amlScoreVal <= 30 ? "LOW" : amlScoreVal <= 70 ? "MEDIUM" : "HIGH — BLOCKED";
  const pendingRequests = allowlistRequests.filter((r) => r.status === "pending");

  return (
    <div className="space-y-4">
      {/* Tx Status */}
      {txStatus && (
        <div className={`text-xs tracking-wider text-center py-2 rounded border ${
          txStatus.startsWith("Confirmed") ? "border-primary/40 text-primary bg-primary/5" :
          txStatus.startsWith("Error") ? "border-destructive/40 text-destructive bg-destructive/5" :
          "border-accent/40 text-accent bg-accent/5"
        }`}>
          {txStatus}
        </div>
      )}

      {/* Allowlist Requests */}
      {pendingRequests.length > 0 && (
        <div className="bg-card border border-primary/30 rounded-lg p-4 card-glow">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] text-primary tracking-widest uppercase">Pending KYC Requests</div>
            <span className="text-[10px] px-2 py-0.5 border border-primary/40 text-primary rounded">{pendingRequests.length}</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {pendingRequests.map((req) => (
              <div key={req.wallet} className="flex items-center justify-between bg-surface rounded px-3 py-2 text-xs">
                <span className="text-foreground font-mono">{shortenAddress(req.wallet, 6)}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveRequest(req.wallet)}
                    disabled={loading === `approve-${req.wallet}`}
                    className="text-primary hover:underline text-[10px] tracking-wider disabled:opacity-30"
                  >
                    {loading === `approve-${req.wallet}` ? "SENDING TX…" : "APPROVE (ON-CHAIN)"}
                  </button>
                  <button onClick={async () => { await rejectRequest(req.wallet); toast.success(`Rejected ${shortenAddress(req.wallet)}`); }} className="text-destructive hover:underline text-[10px] tracking-wider">REJECT</button>
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
            <input placeholder="Wallet address" value={newAdminAddress} onChange={(e) => setNewAdminAddress(e.target.value)} className="flex-1 bg-surface border border-card-border rounded px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none" />
            <button onClick={async () => { if (newAdminAddress.trim()) { await addAdmin(newAdminAddress.trim(), walletAddress); setNewAdminAddress(""); toast.success("Admin wallet added"); } }} className="px-4 py-2 text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors rounded tracking-wider font-medium">ADD ADMIN +</button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {adminWallets.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-3">No admins yet</div>
            ) : (
              adminWallets.map((addr) => (
                <div key={addr} className="flex items-center justify-between bg-surface rounded px-3 py-2 text-xs">
                  <span className="text-foreground font-mono">{shortenAddress(addr, 6)}</span>
                  <div className="flex items-center gap-2">
                    {addr === walletAddress && <span className="text-primary text-[10px]">YOU</span>}
                    <button onClick={async () => { await removeAdmin(addr); toast.success("Admin removed"); }} disabled={addr === walletAddress || addr === "BkR1BUvFmcV6nDYh3FsCEquLqy6KPQnzt6VEQY4Ydcry"} className="text-destructive hover:underline text-[10px] tracking-wider disabled:opacity-30">REMOVE</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* KYC Allowlist — ON-CHAIN */}
        <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase">KYC Allowlist (On-Chain + DB)</div>
            <button onClick={refreshOnChainAllowlist} className="text-[10px] text-primary hover:underline tracking-wider">REFRESH</button>
          </div>
          <div className="flex gap-2 mb-4">
            <input placeholder="Wallet address" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} className="flex-1 bg-surface border border-card-border rounded px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none" />
            <button onClick={handleAddToAllowlistOnChain} disabled={loading === "add-allowlist"} className="px-4 py-2 text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors rounded tracking-wider font-medium disabled:opacity-30">
              {loading === "add-allowlist" ? "TX…" : "ADD ON-CHAIN +"}
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {allowlist.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-3">No wallets on allowlist</div>
            ) : (
              allowlist.map((addr) => (
                <div key={addr} className="flex items-center justify-between bg-surface rounded px-3 py-2 text-xs">
                  <span className="text-foreground font-mono">{shortenAddress(addr, 6)}</span>
                  <div className="flex items-center gap-2">
                    {onChainMembers.includes(addr) && <span className="text-[10px] text-primary">ON-CHAIN</span>}
                    <button
                      onClick={() => handleRemoveFromAllowlistOnChain(addr)}
                      disabled={loading === `remove-${addr}`}
                      className="text-destructive hover:underline text-[10px] tracking-wider disabled:opacity-30"
                    >
                      REVOKE
                    </button>
                  </div>
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
          <input placeholder="Wallet address" value={amlAddress} onChange={(e) => setAmlAddress(e.target.value)} className="w-full bg-surface border border-card-border rounded px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none mb-4" />
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Risk Score</span>
              <span className={`font-semibold ${amlScoreVal <= 30 ? "text-primary" : amlScoreVal <= 70 ? "text-accent" : "text-destructive"}`}>{amlScoreVal}/100 — {riskLabel}</span>
            </div>
            <input type="range" min={0} max={100} value={amlScoreVal} onChange={(e) => setAmlScoreVal(parseInt(e.target.value))} className="w-full accent-primary" />
          </div>
          <select value={amlReason} onChange={(e) => setAmlReason(e.target.value as AmlReason)} className="w-full bg-surface border border-card-border rounded px-3 py-2 text-xs text-foreground mb-4 focus:outline-none">
            {AML_REASONS.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
          </select>
          <button onClick={async () => { if (!amlAddress.trim()) { toast.error("Enter a wallet address"); return; } await setAmlScore(amlAddress.trim(), amlScoreVal, amlReason); toast.success(`AML score set: ${amlScoreVal}/100 for ${shortenAddress(amlAddress)}`); }} className="w-full py-2 text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors rounded tracking-wider font-medium">SET SCORE</button>
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
                    <span className={`font-semibold ${data.score <= 30 ? "text-primary" : data.score <= 70 ? "text-accent" : "text-destructive"}`}>{data.score}/100</span>
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
            <tr className="border-b border-card-border/50"><td className="py-2 pr-4">KYC</td><td className="py-2 pr-4">All transactions</td><td className="py-2">Block if not on AllowList PDA</td></tr>
            <tr className="border-b border-card-border/50"><td className="py-2 pr-4">AML</td><td className="py-2 pr-4">Score &gt;70/100</td><td className="py-2">Block at instruction level</td></tr>
            <tr className="border-b border-card-border/50"><td className="py-2 pr-4">KYT</td><td className="py-2 pr-4">All txns, flag $10k</td><td className="py-2">Emit KytEvent on-chain</td></tr>
            <tr><td className="py-2 pr-4">Travel Rule</td><td className="py-2 pr-4">Transfers ≥$3,000</td><td className="py-2">Require VASP fields + PDA record</td></tr>
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
                <span className={req.status === "approved" ? "text-primary" : req.status === "rejected" ? "text-destructive" : "text-accent"}>{req.status.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
