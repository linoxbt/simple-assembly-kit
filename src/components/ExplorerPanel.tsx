import { useState } from "react";
import { formatUsd, formatOz, formatRatio, formatTime, shortenAddress } from "@/utils/format";
import { useProtocolStore } from "@/stores/protocolStore";

const ExplorerPanel = () => {
  const { kytEvents, travelRuleRecords } = useProtocolStore();
  const [vaultQuery, setVaultQuery] = useState("");
  const [travelQuery, setTravelQuery] = useState("");
  const [queriedVault, setQueriedVault] = useState<null | { collateral: number; xusd: number; ratio: number; health: string }>(null);

  const handleVaultQuery = () => {
    if (vaultQuery.trim()) setQueriedVault(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Vault Lookup</div>
          <div className="flex gap-2 mb-3">
            <input placeholder="Wallet address" value={vaultQuery} onChange={(e) => setVaultQuery(e.target.value)} className="flex-1 bg-surface border border-card-border rounded px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none" />
            <button onClick={handleVaultQuery} className="px-4 py-2 text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors rounded tracking-wider font-medium">QUERY</button>
          </div>
          {queriedVault ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Collateral</span><span className="text-primary">{formatOz(queriedVault.collateral)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">xUSD Debt</span><span>{formatUsd(queriedVault.xusd)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Ratio</span><span className="text-primary">{formatRatio(queriedVault.ratio)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-primary">{queriedVault.health}</span></div>
            </div>
          ) : vaultQuery ? (
            <div className="text-xs text-muted-foreground text-center py-3">No vault found — will query on-chain after program deployment</div>
          ) : null}
        </div>

        <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Travel Rule Lookup</div>
          <div className="flex gap-2 mb-3">
            <input placeholder="Transfer ID (hex)" value={travelQuery} onChange={(e) => setTravelQuery(e.target.value)} className="flex-1 bg-surface border border-card-border rounded px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none" />
            <button className="px-4 py-2 text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors rounded tracking-wider font-medium">QUERY</button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-card-border rounded-lg p-4 card-glow overflow-x-auto">
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">KYT Event Log</div>
          {kytEvents.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">No events recorded</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-card-border text-muted-foreground">
                  <th className="text-left py-2">TIME</th><th className="text-left py-2">ACTION</th><th className="text-left py-2">AMOUNT</th><th className="text-left py-2">FROM</th><th className="text-left py-2">FLAG</th>
                </tr>
              </thead>
              <tbody>
                {kytEvents.map((e, i) => (
                  <tr key={i} className="border-b border-card-border/30">
                    <td className="py-2 text-muted-foreground">{formatTime(e.time)}</td>
                    <td className="py-2">{e.action}</td>
                    <td className="py-2">{e.amount}</td>
                    <td className="py-2 text-muted-foreground">{shortenAddress(e.wallet)}</td>
                    <td className="py-2">{e.flagged && <span className="text-accent border border-accent/40 px-1.5 py-0.5 rounded text-[10px]">⚠ $10K+</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-card border border-card-border rounded-lg p-4 card-glow overflow-x-auto">
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Travel Rule Records</div>
          {travelRuleRecords.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">No travel rule records</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-card-border text-muted-foreground">
                  <th className="text-left py-2">ID</th><th className="text-left py-2">AMOUNT</th><th className="text-left py-2">ORIG VASP</th><th className="text-left py-2">BENE VASP</th><th className="text-left py-2">PDA</th>
                </tr>
              </thead>
              <tbody>
                {travelRuleRecords.map((r, i) => (
                  <tr key={i} className="border-b border-card-border/30">
                    <td className="py-2 text-primary">{shortenAddress(r.id)}</td>
                    <td className="py-2">{formatUsd(r.amount)}</td>
                    <td className="py-2">{r.origVasp}</td>
                    <td className="py-2">{r.beneVasp}</td>
                    <td className="py-2 text-muted-foreground">{shortenAddress(r.pda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExplorerPanel;
