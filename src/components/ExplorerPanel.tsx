import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { formatUsd, formatOz, formatRatio, formatTime, shortenAddress } from "@/utils/format";
import { useProtocolStore } from "@/stores/protocolStore";
import { fetchVaultState, fetchTokenBalance, COLLATERAL_MINT_PK, XUSD_MINT_PK, connection } from "@/services/anchorProgram";
import { SOLANA_NETWORK } from "@/utils/constants";
import { toast } from "sonner";

const ExplorerPanel = () => {
  const { kytEvents, travelRuleRecords, transactions } = useProtocolStore();
  const [vaultQuery, setVaultQuery] = useState("");
  const [travelQuery, setTravelQuery] = useState("");
  const [queriedVault, setQueriedVault] = useState<null | {
    collateral: number;
    xusd: number;
    ratio: number;
    health: string;
    xauBalance: number;
    xusdBalance: number;
  }>(null);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);

  const handleVaultQuery = async () => {
    const addr = vaultQuery.trim();
    if (!addr) return;

    setVaultLoading(true);
    setVaultError(null);
    setQueriedVault(null);

    try {
      const pubkey = new PublicKey(addr);
      const [vaultData, xauBal, xusdBal] = await Promise.all([
        fetchVaultState(pubkey),
        fetchTokenBalance(pubkey, COLLATERAL_MINT_PK),
        fetchTokenBalance(pubkey, XUSD_MINT_PK),
      ]);

      if (!vaultData) {
        setQueriedVault({
          collateral: 0,
          xusd: 0,
          ratio: 0,
          health: "NO VAULT",
          xauBalance: xauBal,
          xusdBalance: xusdBal,
        });
      } else {
        const ratio = vaultData.xusdDebt > 0
          ? (vaultData.collateralOz * 3000 / vaultData.xusdDebt) * 100
          : 0;
        const health = vaultData.xusdDebt === 0
          ? "EMPTY"
          : ratio <= 120
          ? "LIQUIDATABLE"
          : ratio <= 150
          ? "DANGER"
          : "HEALTHY";

        setQueriedVault({
          collateral: vaultData.collateralOz,
          xusd: vaultData.xusdDebt,
          ratio,
          health,
          xauBalance: xauBal,
          xusdBalance: xusdBal,
        });
      }
    } catch (err: any) {
      setVaultError("Invalid address or network error");
    } finally {
      setVaultLoading(false);
    }
  };

  const explorerUrl = (sig: string) =>
    `https://explorer.solana.com/tx/${sig}?cluster=${SOLANA_NETWORK}`;

  const walletExplorerUrl = (addr: string) =>
    `https://explorer.solana.com/address/${addr}?cluster=${SOLANA_NETWORK}`;

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Vault Lookup */}
        <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">On-Chain Vault Lookup</div>
          <div className="flex gap-2 mb-3">
            <input
              placeholder="Wallet address (Base58)"
              value={vaultQuery}
              onChange={(e) => setVaultQuery(e.target.value)}
              className="flex-1 bg-surface border border-card-border rounded px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
            <button
              onClick={handleVaultQuery}
              disabled={vaultLoading}
              className="px-4 py-2 text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors rounded tracking-wider font-medium disabled:opacity-30"
            >
              {vaultLoading ? "QUERYING…" : "QUERY"}
            </button>
          </div>
          {vaultError && (
            <div className="text-xs text-destructive text-center py-3">{vaultError}</div>
          )}
          {queriedVault && (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vault Status</span>
                <span className="text-primary">{queriedVault.health}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Locked Collateral</span>
                <span className="text-primary">{formatOz(queriedVault.collateral)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">xUSD Debt</span>
                <span>{formatUsd(queriedVault.xusd)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Collateral Ratio</span>
                <span className="text-primary">{queriedVault.ratio > 0 ? formatRatio(queriedVault.ratio) : "N/A"}</span>
              </div>
              <div className="border-t border-card-border pt-2 mt-2">
                <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-1">Wallet Balances</div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">XAU</span>
                  <span>{queriedVault.xauBalance.toFixed(4)} oz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">xUSD</span>
                  <span>{queriedVault.xusdBalance.toFixed(2)}</span>
                </div>
              </div>
              <a
                href={walletExplorerUrl(vaultQuery.trim())}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[10px] text-primary hover:underline tracking-wider text-center mt-2"
              >
                VIEW ON SOLANA EXPLORER →
              </a>
            </div>
          )}
        </div>

        {/* Travel Rule Lookup */}
        <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Travel Rule Lookup</div>
          <div className="flex gap-2 mb-3">
            <input
              placeholder="Transfer ID or PDA"
              value={travelQuery}
              onChange={(e) => setTravelQuery(e.target.value)}
              className="flex-1 bg-surface border border-card-border rounded px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
            <button className="px-4 py-2 text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors rounded tracking-wider font-medium">
              QUERY
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent Transactions */}
        <div className="bg-card border border-card-border rounded-lg p-4 card-glow overflow-x-auto">
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Recent Transactions</div>
          {transactions.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">No transactions recorded</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-card-border text-muted-foreground">
                  <th className="text-left py-2">TYPE</th>
                  <th className="text-left py-2">AMOUNT</th>
                  <th className="text-left py-2">WALLET</th>
                  <th className="text-left py-2">TX</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 20).map((tx, i) => (
                  <tr key={i} className="border-b border-card-border/30">
                    <td className="py-2 text-primary">{tx.type.toUpperCase()}</td>
                    <td className="py-2">{tx.type === "deposit" ? formatOz(tx.amount) : formatUsd(tx.amount)}</td>
                    <td className="py-2 text-muted-foreground font-mono">{shortenAddress(tx.wallet ?? "")}</td>
                    <td className="py-2">
                      <a href={explorerUrl(tx.txSignature)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-[10px]">
                        {shortenAddress(tx.txSignature, 6)}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* KYT Event Log */}
        <div className="bg-card border border-card-border rounded-lg p-4 card-glow overflow-x-auto">
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">KYT Event Log</div>
          {kytEvents.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">No events recorded</div>
          ) : (
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
                {kytEvents.map((e, i) => (
                  <tr key={i} className="border-b border-card-border/30">
                    <td className="py-2 text-muted-foreground">{formatTime(e.time)}</td>
                    <td className="py-2">{e.action}</td>
                    <td className="py-2">{e.amount}</td>
                    <td className="py-2 text-muted-foreground">{shortenAddress(e.wallet)}</td>
                    <td className="py-2">
                      {e.flagged && (
                        <span className="text-accent border border-accent/40 px-1.5 py-0.5 rounded text-[10px]">⚠ $10K+</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Travel Rule Records */}
      {travelRuleRecords.length > 0 && (
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
        </div>
      )}
    </div>
  );
};

export default ExplorerPanel;
