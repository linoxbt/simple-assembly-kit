import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { HealthStatus, MINT_RATIO_BPS, LIQUIDATION_RATIO_BPS, TOKEN_DECIMALS } from "@/utils/constants";
import { fetchVaultState, fetchTokenBalance, COLLATERAL_MINT_PK, XUSD_MINT_PK } from "@/services/anchorProgram";

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
  xauBalance: number;
  xusdBalance: number;
}

export interface PriceData {
  symbol: string;
  price: number;
  source: string;
}

function computeHealth(ratio: number, debt: number): HealthStatus {
  if (debt === 0) return "empty";
  if (ratio <= LIQUIDATION_RATIO_BPS / 100) return "liquidated";
  if (ratio <= 130) return "danger";
  if (ratio <= 160) return "warning";
  return "healthy";
}

export function useVault(xauPrice?: number) {
  const { publicKey, connected } = useWallet();
  const [vault, setVault] = useState<VaultState>({
    collateralOz: 0,
    collateralUsdValue: 0,
    xusdDebt: 0,
    collateralRatio: 0,
    maxMintable: 0,
    health: "empty",
    isLiquidated: false,
    xauPriceUsd: xauPrice ?? 0,
    priceIsStale: false,
    priceFromSix: true,
    priceUpdatedAt: null,
    isKycVerified: false,
    vaultExists: false,
    xauBalance: 0,
    xusdBalance: 0,
  });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const price = xauPrice ?? 0;

    if (!connected || !publicKey) {
      setVault((prev) => ({
        ...prev,
        xauPriceUsd: price,
        priceUpdatedAt: new Date(),
        collateralOz: 0,
        collateralUsdValue: 0,
        xusdDebt: 0,
        collateralRatio: 0,
        maxMintable: 0,
        health: "empty",
        vaultExists: false,
        xauBalance: 0,
        xusdBalance: 0,
      }));
      return;
    }

    setLoading(true);
    try {
      const [vaultData, xauBal, xusdBal] = await Promise.all([
        fetchVaultState(publicKey),
        fetchTokenBalance(publicKey, COLLATERAL_MINT_PK),
        fetchTokenBalance(publicKey, XUSD_MINT_PK),
      ]);

      const collateralOz = vaultData?.collateralOz ?? 0;
      const xusdDebt = vaultData?.xusdDebt ?? 0;
      const collateralUsdValue = collateralOz * price;
      const collateralRatio = xusdDebt > 0 ? (collateralUsdValue / xusdDebt) * 100 : 0;
      const maxMintable = (collateralUsdValue * 100) / (MINT_RATIO_BPS / 100) - xusdDebt;
      const health = computeHealth(collateralRatio, xusdDebt);

      setVault({
        collateralOz,
        collateralUsdValue,
        xusdDebt,
        collateralRatio,
        maxMintable: Math.max(0, maxMintable),
        health,
        isLiquidated: health === "liquidated",
        xauPriceUsd: price,
        priceIsStale: false,
        priceFromSix: true,
        priceUpdatedAt: new Date(),
        isKycVerified: false,
        vaultExists: !!vaultData,
        xauBalance: xauBal,
        xusdBalance: xusdBal,
      });
    } catch (err) {
      console.error("Failed to refresh vault:", err);
      setVault((prev) => ({ ...prev, xauPriceUsd: price, priceUpdatedAt: new Date() }));
    } finally {
      setLoading(false);
    }
  }, [publicKey, connected, xauPrice]);

  // Refresh on wallet connect/disconnect and periodically
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { vault, loading, refresh };
}
