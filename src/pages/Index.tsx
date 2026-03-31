import { useState, useEffect } from "react";
import Header from "@/components/Header";
import PriceTicker from "@/components/PriceTicker";
import VaultDashboard from "@/components/VaultDashboard";
import AdminPanel from "@/components/AdminPanel";
import ExplorerPanel from "@/components/ExplorerPanel";
import Footer from "@/components/Footer";
import LoadingScreen from "@/components/LoadingScreen";
import { useVault } from "@/hooks/useVault";
import { usePriceFeed } from "@/hooks/usePriceFeed";
import { useProtocolStore } from "@/stores/protocolStore";

const Index = () => {
  const { prices, feeds, primarySource } = usePriceFeed();
  const xauPrice = feeds.find((f) => f.symbol === "XAU/USD")?.price ?? 0;
  const { vault, refresh } = useVault(xauPrice);
  const [activeTab, setActiveTab] = useState("vault");
  const initialized = useProtocolStore((s) => s.initialized);
  const initializeStore = useProtocolStore((s) => s.initializeStore);

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  if (!initialized) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="scanline-overlay" />

      <PriceTicker prices={prices} />

      <Header
        xauPrice={vault.xauPriceUsd}
        priceSource={primarySource}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="flex-1 container mx-auto px-4 py-6">
        {activeTab === "vault" && <VaultDashboard vault={vault} prices={prices} onRefresh={refresh} />}
        {activeTab === "admin" && <AdminPanel />}
        {activeTab === "explorer" && <ExplorerPanel />}
      </main>

      <Footer />
    </div>
  );
};

export default Index;
