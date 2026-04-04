import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import MetricCard from "@/components/MetricCard";
import RatioGauge from "@/components/RatioGauge";
import ComplianceStatusPanel from "@/components/ComplianceStatusPanel";
import KytEventsPanel from "@/components/KytEventsPanel";
import TransactionHistoryPanel from "@/components/TransactionHistoryPanel";
import LiquidationMonitor from "@/components/LiquidationMonitor";
import ProtocolDiagram from "@/components/ProtocolDiagram";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import AllowlistRequestButton from "@/components/AllowlistRequestButton";
import { useProtocolStore } from "@/stores/protocolStore";
import { useVaultNotifications } from "@/hooks/useVaultNotifications";
import { VaultState } from "@/hooks/useVault";
import { formatUsd, formatOz, formatRatio } from "@/utils/format";
import { TRAVEL_RULE_THRESHOLD, KYT_FLAG_THRESHOLD, SOLANA_NETWORK } from "@/utils/constants";
import { depositCollateral, mintXusd, burnXusd, parseProgramError } from "@/services/anchorProgram";
import TravelRulePanel from "@/components/TravelRulePanel";
import { toast } from "sonner";

interface VaultDashboardProps {
  vault: VaultState;
  prices: { symbol: string; price: number; source: string }[];
  onRefresh?: () => void;
}

const VaultDashboard = ({ vault, prices, onRefresh }: VaultDashboardProps) => {
  const { publicKey, signTransaction, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const walletAddress = publicKey?.toBase58() ?? null;
  const addTransaction = useProtocolStore((s) => s.addTransaction);
  const addKytEvent = useProtocolStore((s) => s.addKytEvent);
  const transactions = useProtocolStore((s) => s.transactions);

  useVaultNotifications(vault, connected);

  const [depositOz, setDepositOz] = useState("");
  const [mintUsd, setMintUsd] = useState("");
  const [burnUsd, setBurnUsd] = useState("");
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const mintAmount = parseFloat(mintUsd) || 0;
  const showTravelRule = mintAmount >= TRAVEL_RULE_THRESHOLD;

  const explorerTxUrl = (sig: string) =>
    `https://explorer.solana.com/tx/${sig}?cluster=${SOLANA_NETWORK}`;

  const recordAction = async (
    type: "deposit" | "mint" | "burn",
    amount: number,
    unit: string,
    txSig: string
  ) => {
    await addTransaction({
      id: Date.now().toString(),
      type,
      amount,
      unit,
      txSignature: txSig,
      timestamp: new Date(),
      status: "confirmed",
      wallet: walletAddress ?? "unknown",
    });
    await addKytEvent({
      time: new Date(),
      action: type.toUpperCase(),
      amount: type === "deposit" ? `${amount}oz` : formatUsd(amount),
      asset: type === "deposit" ? "XAU" : "xUSD",
      flagged: amount >= KYT_FLAG_THRESHOLD,
      wallet: walletAddress ?? "unknown",
    });
  };

  const handleDeposit = async () => {
    if (!connected || !publicKey || !signTransaction) {
      toast.error("Connect your wallet first");
      return;
    }
    const oz = parseFloat(depositOz);
    if (!oz || oz <= 0) return;
    setLoading("deposit");
    setTxStatus("Waiting for wallet approval...");
    try {
      const result = await depositCollateral(publicKey, oz, signTransaction);
      if (result.success && result.txSignature) {
        setTxStatus(`Confirmed ✓ tx: ${result.txSignature.slice(0, 8)}...`);
        toast.success(`Deposited ${oz} oz XAU`, {
          description: (
            <a href={explorerTxUrl(result.txSignature)} target="_blank" rel="noopener noreferrer" className="underline">
              View on Explorer →
            </a>
          ),
        });
        await recordAction("deposit", oz, "oz XAU", result.txSignature);
        setDepositOz("");
        onRefresh?.();
      } else {
        setTxStatus(`Error: ${result.error}`);
        toast.error("Deposit failed", { description: result.error });
      }
    } catch (err: any) {
      const msg = parseProgramError(err);
      setTxStatus(`Error: ${msg}`);
      toast.error("Deposit failed", { description: msg });
    } finally {
      setLoading(null);
    }
  };

  const handleMint = async () => {
    if (!connected || !publicKey || !signTransaction) {
      toast.error("Connect your wallet first");
      return;
    }
    if (!mintAmount || mintAmount <= 0) return;
    setLoading("mint");
    setTxStatus("Waiting for wallet approval...");
    try {
      const result = await mintXusd(publicKey, mintAmount, signTransaction);
      if (result.success && result.txSignature) {
        setTxStatus(`Confirmed ✓ tx: ${result.txSignature.slice(0, 8)}...`);
        toast.success(`Minted ${formatUsd(mintAmount)} xUSD`, {
          description: (
            <a href={explorerTxUrl(result.txSignature)} target="_blank" rel="noopener noreferrer" className="underline">
              View on Explorer →
            </a>
          ),
        });
        await recordAction("mint", mintAmount, "xUSD", result.txSignature);
        setMintUsd("");
        onRefresh?.();
      } else {
        setTxStatus(`Error: ${result.error}`);
        toast.error("Mint failed", { description: result.error });
      }
    } catch (err: any) {
      const msg = parseProgramError(err);
      setTxStatus(`Error: ${msg}`);
      toast.error("Mint failed", { description: msg });
    } finally {
      setLoading(null);
    }
  };

  const handleBurn = async () => {
    if (!connected || !publicKey || !signTransaction) {
      toast.error("Connect your wallet first");
      return;
    }
    const usd = parseFloat(burnUsd);
    if (!usd || usd <= 0) return;
    setLoading("burn");
    setTxStatus("Waiting for wallet approval...");
    try {
      const result = await burnXusd(publicKey, usd, signTransaction);
      if (result.success && result.txSignature) {
        setTxStatus(`Confirmed ✓ tx: ${result.txSignature.slice(0, 8)}...`);
        toast.success(`Burned ${formatUsd(usd)} xUSD`, {
          description: (
            <a href={explorerTxUrl(result.txSignature)} target="_blank" rel="noopener noreferrer" className="underline">
              View on Explorer →
            </a>
          ),
        });
        await recordAction("burn", usd, "xUSD", result.txSignature);
        setBurnUsd("");
        onRefresh?.();
      } else {
        setTxStatus(`Error: ${result.error}`);
        toast.error("Burn failed", { description: result.error });
      }
    } catch (err: any) {
      const msg = parseProgramError(err);
      setTxStatus(`Error: ${msg}`);
      toast.error("Burn failed", { description: msg });
    } finally {
      setLoading(null);
    }
  };

  const healthColor =
    vault.health === "healthy" || vault.health === "empty"
      ? "text-primary"
      : vault.health === "warning"
      ? "text-accent"
      : "text-destructive";

  const walletTxs = transactions.filter((t) => t.wallet === walletAddress);

  // ─── NOT CONNECTED ─────────────────────────────────────
  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="text-center space-y-3">
          <img src="/aurumx-logo.png" alt="AurumX" className="h-16 w-16 mx-auto opacity-60" />
          <h2 className="text-lg font-bold text-primary tracking-widest">CONNECT WALLET</h2>
          <p className="text-xs text-muted-foreground max-w-sm">
            Connect your Solana wallet to interact with AurumX vaults on Devnet.
            All data is read from the blockchain in real-time.
          </p>
        </div>
        <button
          onClick={() => setVisible(true)}
          className="px-8 py-3 text-sm border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors rounded tracking-wider font-medium"
        >
          CONNECT WALLET →
        </button>
      </div>
    );
  }

  // ─── LOADING ───────────────────────────────────────────
  if (vault.dataLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="animate-pulse">
          <img src="/aurumx-logo.png" alt="Loading" className="h-12 w-12 mx-auto opacity-40" />
        </div>
        <p className="text-xs text-muted-foreground tracking-wider">FETCHING ON-CHAIN DATA...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Price Warning */}
      {vault.priceNotInitialized && (
        <div className="text-xs tracking-wider text-center py-2 rounded border border-accent/40 text-accent bg-accent/5 flex items-center justify-center gap-2">
          ⚠ PRICE FEED NOT INITIALISED
          <button
            onClick={async () => {
              setTxStatus("Calling price keeper...");
              try {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
                const res = await fetch(`${supabaseUrl}/functions/v1/price-keeper`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey },
                });
                const data = await res.json();
                if (data.success) {
                  setTxStatus(`Price updated: $${data.price.toFixed(2)} ✓`);
                  toast.success("Price written on-chain");
                  onRefresh?.();
                } else {
                  setTxStatus(`Error: ${data.error}`);
                }
              } catch (err: any) {
                setTxStatus(`Error: ${err.message}`);
              }
            }}
            className="text-primary hover:underline text-[10px] tracking-wider"
          >
            [UPDATE NOW]
          </button>
        </div>
      )}
      {vault.priceIsStale && !vault.priceNotInitialized && (
        <div className="text-xs tracking-wider text-center py-2 rounded border border-accent/40 text-accent bg-accent/5 flex items-center justify-center gap-2">
          ⚠ PRICE FEED STALE — Last updated {vault.priceUpdatedAt?.toLocaleTimeString()}
          <button
            onClick={async () => {
              setTxStatus("Refreshing price...");
              try {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
                const res = await fetch(`${supabaseUrl}/functions/v1/price-keeper`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey },
                });
                const data = await res.json();
                if (data.success) {
                  setTxStatus(`Price updated: $${data.price.toFixed(2)} ✓`);
                  toast.success("Price refreshed on-chain");
                  onRefresh?.();
                } else {
                  setTxStatus(`Error: ${data.error}`);
                }
              } catch (err: any) {
                setTxStatus(`Error: ${err.message}`);
              }
            }}
            className="text-primary hover:underline text-[10px] tracking-wider"
          >
            [REFRESH]
          </button>
        </div>
      )}

      {/* KYC Status */}
      {vault.isKycVerified ? (
        <div className="text-xs tracking-wider text-center py-2 rounded border border-primary/40 text-primary bg-primary/5">
          ✓ KYC VERIFIED — WALLET ON ALLOWLIST
        </div>
      ) : (
        <>
          <AllowlistRequestButton />
          <div className="text-xs tracking-wider text-center py-2 rounded border border-destructive/40 text-destructive bg-destructive/5">
            ✗ KYC NOT VERIFIED — REQUEST ALLOWLIST ACCESS ABOVE
          </div>
        </>
      )}

      {/* Token Balances */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="XAU Balance" value={`${vault.xauBalance.toFixed(4)} oz`} sub="in your wallet" />
        <MetricCard label="xUSD Balance" value={`${vault.xusdBalance.toFixed(2)}`} sub="in your wallet" />
      </div>

      {/* Vault Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Collateral (Locked)"
          value={vault.vaultExists ? formatOz(vault.collateralOz) : "No vault"}
          sub={vault.vaultExists ? `≈${formatUsd(vault.collateralUsdValue)}` : "deposit to create"}
        />
        <MetricCard
          label="xUSD Minted"
          value={vault.vaultExists ? formatUsd(vault.xusdDebt) : "—"}
          sub={vault.vaultExists ? "outstanding debt" : ""}
        />
        <MetricCard
          label="Collateral Ratio"
          value={vault.vaultExists && vault.xusdDebt > 0 ? formatRatio(vault.collateralRatio) : "—"}
          sub={vault.vaultExists ? vault.health.toUpperCase() : ""}
          colorClass={healthColor}
        />
        <MetricCard
          label="Max Mintable"
          value={vault.vaultExists ? formatUsd(vault.maxMintable) : "—"}
          sub="at 150% ratio"
        />
      </div>

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

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <RatioGauge ratio={vault.collateralRatio} health={vault.health} />
          {vault.xauPriceUsd > 0 && <PriceHistoryChart currentPrice={vault.xauPriceUsd} />}
          <ProtocolDiagram />

          {/* Deposit */}
          <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Deposit XAU Collateral</div>
            <div className="flex gap-2">
              <input type="number" placeholder="oz" value={depositOz} onChange={(e) => setDepositOz(e.target.value)} className="flex-1 bg-surface border border-card-border rounded px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              <button onClick={handleDeposit} disabled={loading === "deposit" || !vault.isKycVerified} className="px-6 py-2 text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-30 transition-colors rounded tracking-wider font-medium">
                {loading === "deposit" ? "AWAITING WALLET…" : "DEPOSIT →"}
              </button>
            </div>
          </div>

          {/* Mint */}
          <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Mint xUSD</div>
            <div className="flex gap-2">
              <input type="number" placeholder="USD" value={mintUsd} onChange={(e) => setMintUsd(e.target.value)} className="flex-1 bg-surface border border-card-border rounded px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              <button onClick={handleMint} disabled={showTravelRule || loading === "mint" || !vault.isKycVerified || vault.priceIsStale || vault.priceNotInitialized} className="px-6 py-2 text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-30 transition-colors rounded tracking-wider font-medium">
                {loading === "mint" ? "AWAITING WALLET…" : "MINT →"}
              </button>
            </div>
            {showTravelRule && <div className="mt-3"><TravelRulePanel amount={mintAmount} onSubmit={handleMint} /></div>}
          </div>

          {/* Burn */}
          <div className="bg-card border border-card-border rounded-lg p-4 card-glow">
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Burn xUSD / Reclaim Collateral</div>
            <div className="flex gap-2">
              <input type="number" placeholder="xUSD" value={burnUsd} onChange={(e) => setBurnUsd(e.target.value)} className="flex-1 bg-surface border border-card-border rounded px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              <button onClick={handleBurn} disabled={loading === "burn" || !vault.isKycVerified} className="px-6 py-2 text-xs border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-30 transition-colors rounded tracking-wider font-medium">
                {loading === "burn" ? "AWAITING WALLET…" : "BURN →"}
              </button>
            </div>
          </div>

          <TransactionHistoryPanel transactions={walletTxs} />
        </div>

        <div className="space-y-4">
          <ComplianceStatusPanel
            isKycVerified={vault.isKycVerified}
            xauPrice={vault.xauPriceUsd}
            xagPrice={0}
            priceSource={vault.priceFromSix ? "SIX (On-Chain)" : "Pyth"}
            priceIsStale={vault.priceIsStale}
            priceNotInitialized={vault.priceNotInitialized}
          />
          <LiquidationMonitor />
          <KytEventsPanel />
        </div>
      </div>
    </div>
  );
};

export default VaultDashboard;
