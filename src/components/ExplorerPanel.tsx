import { useState } from "react";
import { formatUsd, formatOz, formatRatio, formatTime, shortenAddress } from "@/utils/format";

const MOCK_KYT_LOG = [
  { time: new Date(), action: "MINT", amount: 5000, asset: "xUSD", from: "7xKX...mP3q", flagged: false },
  { time: new Date(Date.now() - 120_000), action: "DEPOSIT", amount: 5, asset: "XAU", from: "7xKX...mP3q", flagged: false },
  { time: new Date(Date.now() - 600_000), action: "TRANSFER", amount: 12000, asset: "xUSD", from: "4dRY...nW2k", flagged: true },
];

const MOCK_TRAVEL_RULES = [
  { id: "a3f2...c8d1", amount: 5000, origVasp: "AMINA Bank AG", beneVasp: "Sygnum Bank AG", timestamp: new Date(Date.now() - 300_000), pda: "9kLp...xQ4m" },
  { id: "b7e1...d4f2", amount: 12000, origVasp: "AMINA Bank AG", beneVasp: "Bitcoin Suisse AG", timestamp: new Date(Date.now() - 900_000), pda: "3mNr...yT8w" },
];

const ExplorerPanel = () => {
  const [vaultQuery, setVaultQuery] = useState("");
  const [travelQuery, setTravelQuery] = useState("");
  const [queriedVault, setQueriedVault] = useState<null | { collateral: number; xusd: number; ratio: number; health: string }>(null);

  const handleVaultQuery = () => {
    if (vaultQuery.trim()) {
      setQueriedVault({ collateral: 5.0, xusd: 5000, ratio: 234.6, health: "HEALTHY" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Vault Lookup */}
        <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Vault Lookup</div>
          <div className="flex gap-2 mb-3">
            <input
              placeholder="Wallet address"
              value={vaultQuery}
              onChange={(e) => setVaultQuery(e.target.value)}
              className="flex-1 bg-surface border border-card-border rounded px-3 py-2 text-xs text-foreground focus:border-info focus:outline-none"
            />
            <button onClick={handleVaultQuery} className="px-4 py-2 text-xs border border-info text-info hover:bg-info hover:text-info-foreground transition-colors rounded tracking-wider font-medium">
              QUERY
            </button>
          </div>
          {queriedVault && (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Collateral</span><span className="text-primary">{formatOz(queriedVault.collateral)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">xUSD Debt</span><span>{formatUsd(queriedVault.xusd)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Ratio</span><span className="text-success">{formatRatio(queriedVault.ratio)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-success">{queriedVault.health}</span></div>
            </div>
          )}
        </div>

        {/* Travel Rule Lookup */}
        <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Travel Rule Lookup</div>
          <div className="flex gap-2 mb-3">
            <input
              placeholder="Transfer ID (hex)"
              value={travelQuery}
              onChange={(e) => setTravelQuery(e.target.value)}
              className="flex-1 bg-surface border border-card-border rounded px-3 py-2 text-xs text-foreground focus:border-purple focus:outline-none"
            />
            <button className="px-4 py-2 text-xs border border-purple text-purple hover:bg-purple hover:text-purple-foreground transition-colors rounded tracking-wider font-medium">
              QUERY
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* KYT Event Log */}
        <div className="bg-card border border-card-border rounded-lg p-4 card-glow overflow-x-auto">
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">KYT Event Log</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-card-border text-muted-foreground">
                <th className="text-left py-2">TIME</th>
                <th className="text-left py-2">ACTION</th>
                <th className="text-left py-2">AMOUNT</th>
                <th className="text-left py-2">FROM</th>
                <th className="text-left py-2">FLAG</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_KYT_LOG.map((e, i) => (
                <tr key={i} className="border-b border-card-border/30">
                  <td className="py-2 text-muted-foreground">{formatTime(e.time)}</td>
                  <td className="py-2">{e.action}</td>
                  <td className="py-2">{typeof e.amount === "number" && e.asset === "xUSD" ? formatUsd(e.amount) : `${e.amount}oz`}</td>
                  <td className="py-2 text-muted-foreground">{e.from}</td>
                  <td className="py-2">
                    {e.flagged && <span className="text-warning border border-warning px-1.5 py-0.5 rounded text-[10px]">⚠ FLAGGED $10K+</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Travel Rule Records */}
        <div className="bg-card border border-card-border rounded-lg p-4 card-glow overflow-x-auto">
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Travel Rule Records</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-card-border text-muted-foreground">
                <th className="text-left py-2">ID</th>
                <th className="text-left py-2">AMOUNT</th>
                <th className="text-left py-2">ORIG VASP</th>
                <th className="text-left py-2">BENE VASP</th>
                <th className="text-left py-2">PDA</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_TRAVEL_RULES.map((r, i) => (
                <tr key={i} className="border-b border-card-border/30">
                  <td className="py-2 text-info">{r.id}</td>
                  <td className="py-2">{formatUsd(r.amount)}</td>
                  <td className="py-2">{r.origVasp}</td>
                  <td className="py-2">{r.beneVasp}</td>
                  <td className="py-2 text-muted-foreground">{r.pda}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExplorerPanel;
