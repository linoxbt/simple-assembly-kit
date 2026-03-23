import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useNavigate, useLocation } from "react-router-dom";
import { formatUsd } from "@/utils/format";
import aurumxLogo from "@/assets/aurumx-logo.png";

interface HeaderProps {
  xauPrice: number;
  priceSource: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Header = ({ xauPrice, priceSource, activeTab, onTabChange }: HeaderProps) => {
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const tabs = ["VAULT", "ADMIN", "EXPLORER", "FAUCET"];

  const handleWalletClick = () => {
    if (connected) {
      disconnect();
    } else {
      setVisible(true);
    }
  };

  const shortAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`
    : null;

  return (
    <header className="border-b border-card-border bg-surface">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={aurumxLogo} alt="AurumX Logo" className="h-8 w-8" />
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
            onClick={handleWalletClick}
            className="px-4 py-1.5 text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors rounded tracking-wider font-medium"
          >
            {connected ? shortAddress : "CONNECT WALLET"}
          </button>
        </div>
      </div>

      <nav className="container mx-auto px-4 flex gap-0">
        {tabs.map((tab) => {
          const tabKey = tab.toLowerCase();
          const isFaucet = tabKey === "faucet";
          const isActive = isFaucet
            ? location.pathname === "/faucet"
            : location.pathname === "/" && activeTab === tabKey;

          return (
            <button
              key={tab}
              onClick={() => {
                if (isFaucet) {
                  navigate("/faucet");
                } else {
                  if (location.pathname !== "/") navigate("/");
                  onTabChange(tabKey);
                }
              }}
              className={`px-6 py-2 text-xs tracking-widest font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </nav>
    </header>
  );
};

export default Header;
