import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { VaultState } from "@/hooks/useVault";

export function useVaultNotifications(vault: VaultState, connected: boolean) {
  const prevRatio = useRef<number>(vault.collateralRatio);
  const notifiedThresholds = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!connected || vault.collateralRatio === 0) return;

    const ratio = vault.collateralRatio;
    const thresholds = [
      { level: 120, label: "LIQUIDATION IMMINENT", desc: "Your vault is at the liquidation threshold!" },
      { level: 130, label: "CRITICAL", desc: "Collateral ratio dangerously low. Add collateral or burn xUSD." },
      { level: 150, label: "WARNING", desc: "Approaching minimum mint ratio. Consider adding collateral." },
      { level: 175, label: "CAUTION", desc: "Collateral ratio declining. Monitor closely." },
    ];

    for (const t of thresholds) {
      if (ratio <= t.level && prevRatio.current > t.level && !notifiedThresholds.current.has(t.level)) {
        notifiedThresholds.current.add(t.level);
        if (t.level <= 130) {
          toast.error(`⚠ ${t.label} — ${ratio.toFixed(1)}%`, { description: t.desc, duration: 10000 });
        } else {
          toast.warning(`${t.label} — ${ratio.toFixed(1)}%`, { description: t.desc, duration: 6000 });
        }
      }
    }

    // Reset notifications if ratio recovers
    if (ratio > 175) {
      notifiedThresholds.current.clear();
    }

    prevRatio.current = ratio;
  }, [vault.collateralRatio, connected]);
}
