import { useState, useEffect, useCallback, useRef } from "react";
import { fetchPrices, type PriceFeedData } from "@/services/priceFeed";

const POLL_INTERVAL_MS = 15_000; // 15 seconds

export function usePriceFeed() {
  const [feeds, setFeeds] = useState<PriceFeedData[]>([]);
  const [primarySource, setPrimarySource] = useState<"Pyth" | "SIX BFI">("SIX BFI");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchPrices();
      setFeeds(result.feeds);
      setPrimarySource(result.primarySource);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  // Convert to legacy PriceData format for backward compatibility
  const prices = feeds.map((f) => ({
    symbol: f.symbol,
    price: f.price,
    source: f.source,
  }));

  return { feeds, prices, primarySource, loading, error, refresh };
}
