import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { HealthStatus, MINT_RATIO_BPS, LIQUIDATION_RATIO_BPS } from "@/utils/constants";
import {
  fetchVaultAccount,
  fetchPriceAccount,
  fetchTokenBalance,
  COLLATERAL_MINT_PK,
  XUSD_MINT_PK,
} from "@/services/anchorProgram";
import { useProtocolStore } from "@/stores/protocolStore";

export interface VaultState {
  collateralOz: number;
  collateralUsdValue: number;
  xusdDebt: number;
  collateralRatio: number;
  maxMintable: number;
  health: HealthStatus;
  isLiquidated: boolean;
  vaultExists: boolean;
  xauPriceUsd: number;
  priceIsStale: boolean;
  priceFromSix: boolean;
  priceUpdatedAt: Date | null;
  priceNotInitialized: boolean;
  // KYC from database
  isKycVerified: boolean;
  xauBalance: number;
  xusdBalance: number;
  dataLoading: boolean;
}

function computeHealth(ratio: number, debt: number): HealthStatus {
  if (debt === 0) return "empty";
  if (ratio <= LIQUIDATION_RATIO_BPS / 100) return "liquidated";
  if (ratio <= 130) return "danger";
  if (ratio <= 160) return "warning";
  return "healthy";
}

const EMPTY_STATE: VaultState = {
  collateralOz: 0, collateralUsdValue: 0, xusdDebt: 0, collateralRatio: 0,
  maxMintable: 0, health: "empty", isLiquidated: false, vaultExists: false,
  xauPriceUsd: 0, priceIsStale: false, priceFromSix: false,
  priceUpdatedAt: null, priceNotInitialized: true,
  isKycVerified: false, xauBalance: 0, xusdBalance: 0, dataLoading: true,
};

export function useVault() {
  const { publicKey, connected } = useWallet();
  const [vault, setVault] = useState<VaultState>(EMPTY_STATE);
  const [loading, setLoading] = useState(false);
  // KYC check from database (offchain)
  const isOnAllowlist = useProtocolStore((s) => s.isOnAllowlist);

  const refresh = useCallback(async () => {
    if (!connected || !publicKey) {
      setVault({ ...EMPTY_STATE, dataLoading: false });
      return;
    }

    setLoading(true);
    try {
      const [vaultData, priceData, xauBal, xusdBal] = await Promise.all([
        fetchVaultAccount(publicKey),
        fetchPriceAccount("XAU/USD"),
        fetchTokenBalance(publicKey, COLLATERAL_MINT_PK),
        fetchTokenBalance(publicKey, XUSD_MINT_PK),
      ]);

      const price = priceData?.price ?? 0;
      const priceNotInitialized = !priceData;
      const priceIsStale = priceData?.isStale ?? false;

      // KYC from database
      const isKycVerified = isOnAllowlist(publicKey.toBase58());

      const collateralOz = vaultData?.collateralAmount ?? 0;
      const xusdDebt = vaultData?.xusdMinted ?? 0;
      const collateralUsdValue = collateralOz * price;
      const collateralRatio = xusdDebt > 0 ? (collateralUsdValue / xusdDebt) * 100 : 0;
      const maxMintable = price > 0
        ? (collateralUsdValue * 100) / (MINT_RATIO_BPS / 100) - xusdDebt
        : 0;
      const health = computeHealth(collateralRatio, xusdDebt);

      setVault({
        collateralOz, collateralUsdValue, xusdDebt, collateralRatio,
        maxMintable: Math.max(0, maxMintable), health,
        isLiquidated: vaultData?.isLiquidated ?? false,
        vaultExists: !!vaultData,
        xauPriceUsd: price, priceIsStale,
        priceFromSix: priceData?.fromSix ?? false,
        priceUpdatedAt: priceData ? new Date(priceData.publishedAt * 1000) : null,
        priceNotInitialized, isKycVerified,
        xauBalance: xauBal, xusdBalance: xusdBal, dataLoading: false,
      });
    } catch (err) {
      console.error("Failed to refresh vault:", err);
      setVault((prev) => ({ ...prev, dataLoading: false }));
    } finally {
      setLoading(false);
    }
  }, [publicKey, connected, isOnAllowlist]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { vault, loading, refresh };
}
