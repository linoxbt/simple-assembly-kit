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

const EMPTY_VAULT: VaultState = {
  collateralOz: 0,
  collateralUsdValue: 0,
  xusdDebt: 0,
  collateralRatio: 0,
  maxMintable: 0,
  health: "empty",
  isLiquidated: false,
  xauPriceUsd: 0,
  priceIsStale: false,
  priceFromSix: false,
  priceUpdatedAt: null,
  isKycVerified: false,
  vaultExists: false,
};

export function useVault(xauPrice?: number) {
  const [vault, setVault] = useState<VaultState>(() => {
    if (xauPrice && xauPrice > 0) {
      return {
        ...EMPTY_VAULT,
        xauPriceUsd: xauPrice,
        priceUpdatedAt: new Date(),
      };
    }
    return EMPTY_VAULT;
  });
  const [loading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);

  return { vault, loading, walletConnected, setWalletConnected, refresh: () => {} };
}
