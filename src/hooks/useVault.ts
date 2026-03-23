import { useState } from "react";
import { HealthStatus } from "@/utils/constants";

export interface VaultState {
  collateralOz: number;
  collateralUsdValue: number;
  xusdDebt: number;
  collateralRatio: number;
  maxMintable: number;
  health: HealthStatus;
  isLiquidated: boolean;
  xauPriceUsd: number;
  priceIsStale: boolean;
  priceFromSix: boolean;
  priceUpdatedAt: Date | null;
  isKycVerified: boolean;
  vaultExists: boolean;
}

export interface PriceData {
  symbol: string;
  price: number;
  source: string;
}

// Mock data for demo - replace with real Solana program calls after deploy
const MOCK_PRICES: PriceData[] = [
  { symbol: "XAU/USD", price: 2345.67, source: "SIX BFI" },
  { symbol: "XAG/USD", price: 29.14, source: "SIX BFI" },
  { symbol: "XPT/USD", price: 982.30, source: "SIX BFI" },
  { symbol: "XPD/USD", price: 1124.50, source: "SIX BFI" },
];

const MOCK_VAULT: VaultState = {
  collateralOz: 5.0,
  collateralUsdValue: 11728.35,
  xusdDebt: 5000.0,
  collateralRatio: 234.6,
  maxMintable: 2818.9,
  health: "healthy",
  isLiquidated: false,
  xauPriceUsd: 2345.67,
  priceIsStale: false,
  priceFromSix: true,
  priceUpdatedAt: new Date(),
  isKycVerified: true,
  vaultExists: true,
};

export function useVault() {
  const [vault] = useState<VaultState>(MOCK_VAULT);
  const [prices] = useState<PriceData[]>(MOCK_PRICES);
  const [loading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);

  return { vault, prices, loading, walletConnected, setWalletConnected, refresh: () => {} };
}
