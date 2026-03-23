import { useState } from "react";
import Header from "@/components/Header";
import PriceTicker from "@/components/PriceTicker";
import VaultDashboard from "@/components/VaultDashboard";
import AdminPanel from "@/components/AdminPanel";
import ExplorerPanel from "@/components/ExplorerPanel";
import Footer from "@/components/Footer";
import { useVault } from "@/hooks/useVault";

const Index = () => {
  const { vault, prices, walletConnected, setWalletConnected } = useVault();
  const [activeTab, setActiveTab] = useState("vault");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="scanline-overlay" />

      <PriceTicker prices={prices} />

      <Header
        xauPrice={vault.xauPriceUsd}
        priceSource={vault.priceFromSix ? "SIX BFI" : "Pyth"}
        walletConnected={walletConnected}
        onConnectWallet={() => setWalletConnected(!walletConnected)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="flex-1 container mx-auto px-4 py-6">
        {activeTab === "vault" && <VaultDashboard vault={vault} prices={prices} />}
        {activeTab === "admin" && <AdminPanel />}
        {activeTab === "explorer" && <ExplorerPanel />}
      </main>

      <Footer />
    </div>
  );
};

export default Index;
