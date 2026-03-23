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

export function useVault(xauPrice?: number) {
  const [vault, setVault] = useState<VaultState>(() => {
    if (xauPrice && xauPrice > 0) {
      const collateralUsdValue = MOCK_VAULT.collateralOz * xauPrice;
      const collateralRatio = (collateralUsdValue / MOCK_VAULT.xusdDebt) * 100;
      const maxMintable = (collateralUsdValue / 1.5) - MOCK_VAULT.xusdDebt;
      return {
        ...MOCK_VAULT,
        xauPriceUsd: xauPrice,
        collateralUsdValue,
        collateralRatio,
        maxMintable: Math.max(0, maxMintable),
      };
    }
    return MOCK_VAULT;
  });
  const [loading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);

  return { vault, loading, walletConnected, setWalletConnected, refresh: () => {} };
}
