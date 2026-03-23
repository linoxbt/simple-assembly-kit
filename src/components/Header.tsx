import { formatUsd } from "@/utils/format";

interface HeaderProps {
  xauPrice: number;
  priceSource: string;
  walletConnected: boolean;
  onConnectWallet: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Header = ({ xauPrice, priceSource, walletConnected, onConnectWallet, activeTab, onTabChange }: HeaderProps) => {
  const tabs = ["VAULT", "ADMIN", "EXPLORER"];

  return (
    <header className="border-b border-card-border bg-surface">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-primary gold-glow tracking-widest">AURUMX</h1>
          <span className="text-[10px] px-2 py-0.5 border border-info text-info rounded font-semibold tracking-wider">DEVNET</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">XAU</span>
            <span className="text-primary font-semibold gold-glow">{formatUsd(xauPrice)}</span>
            <span className="text-muted-foreground">· {priceSource}</span>
          </div>

          <button
            onClick={onConnectWallet}
            className="px-4 py-1.5 text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors rounded tracking-wider font-medium"
          >
            {walletConnected ? "CONNECTED" : "CONNECT WALLET"}
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 flex gap-0">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab.toLowerCase())}
            className={`px-6 py-2 text-xs tracking-widest font-medium border-b-2 transition-colors ${
              activeTab === tab.toLowerCase()
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </header>
  );
};

export default Header;
