import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useKycSetting() {
  const [kycEnabled, setKycEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("protocol_settings")
      .select("kyc_enabled")
      .limit(1)
      .single();
    if (data) setKycEnabled(data.kyc_enabled);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    // Listen for realtime changes
    const channel = supabase
      .channel("protocol-settings-rt")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "protocol_settings" }, (payload) => {
        if (payload.new && typeof (payload.new as any).kyc_enabled === "boolean") {
          setKycEnabled((payload.new as any).kyc_enabled);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  const toggleKyc = useCallback(async (enabled: boolean, adminWallet: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const res = await fetch(`${supabaseUrl}/functions/v1/manage-kyc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
      body: JSON.stringify({ action: "toggle_kyc", enabled, admin_wallet: adminWallet }),
    });
    const result = await res.json();
    if (result.success) setKycEnabled(enabled);
    return result;
  }, []);

  return { kycEnabled: false, loading: false, toggleKyc, refresh };
}
