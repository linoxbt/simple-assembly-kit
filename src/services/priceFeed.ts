/**
 * Price Feed Service — Real-time prices from Pyth Network with SIX Financial fallback.
 * Uses Pyth Hermes API for primary feeds, falls back to mock SIX BFI data.
 */

export interface PriceFeedData {
  symbol: string;
  price: number;
  confidence: number;
  source: "Pyth" | "SIX BFI" | "Mock";
  updatedAt: Date;
  isStale: boolean;
}

// Pyth Hermes price feed IDs (mainnet stable IDs)
const PYTH_FEED_IDS: Record<string, string> = {
  "XAU/USD": "0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63c52edd8f09e5e0613",
  "XAG/USD": "0xf2fb02c32b055c805e7238d628e5e9dadef274376114eb1f012337cabe93871e",
};

const PYTH_HERMES_URL = "https://hermes.pyth.network/v2/updates/price/latest";
const STALE_THRESHOLD_MS = 120_000; // 2 minutes

// SIX BFI fallback prices (mock — replace with real SIX API when available)
const SIX_FALLBACK: Record<string, number> = {
  "XAU/USD": 2345.67,
  "XAG/USD": 29.14,
  "XPT/USD": 982.30,
  "XPD/USD": 1124.50,
};

async function fetchPythPrices(): Promise<PriceFeedData[]> {
  const ids = Object.values(PYTH_FEED_IDS);
  const symbols = Object.keys(PYTH_FEED_IDS);

  const params = new URLSearchParams();
  ids.forEach((id) => params.append("ids[]", id));

  const response = await fetch(`${PYTH_HERMES_URL}?${params.toString()}`);
  if (!response.ok) throw new Error(`Pyth API error: ${response.status}`);

  const data = await response.json();
  const parsed = data.parsed as Array<{
    id: string;
    price: { price: string; expo: number; conf: string; publish_time: number };
  }>;

  return parsed.map((feed, i) => {
    const rawPrice = parseInt(feed.price.price);
    const expo = feed.price.expo;
    const price = rawPrice * Math.pow(10, expo);
    const confidence = parseInt(feed.price.conf) * Math.pow(10, expo);
    const updatedAt = new Date(feed.price.publish_time * 1000);
    const isStale = Date.now() - updatedAt.getTime() > STALE_THRESHOLD_MS;

    return {
      symbol: symbols[i],
      price,
      confidence,
      source: "Pyth" as const,
      updatedAt,
      isStale,
    };
  });
}

function getSixFallbackPrices(): PriceFeedData[] {
  return Object.entries(SIX_FALLBACK).map(([symbol, price]) => ({
    symbol,
    price,
    confidence: 0,
    source: "SIX BFI" as const,
    updatedAt: new Date(),
    isStale: false,
  }));
}

/**
 * Fetch prices from Pyth Network, falling back to SIX BFI mock data.
 * Merges additional SIX-only symbols (XPT, XPD) that Pyth doesn't cover.
 */
export async function fetchPrices(): Promise<{
  feeds: PriceFeedData[];
  primarySource: "Pyth" | "SIX BFI";
}> {
  try {
    const pythFeeds = await fetchPythPrices();

    // Merge SIX-only metals (XPT, XPD) that aren't on Pyth
    const sixFallback = getSixFallbackPrices();
    const pythSymbols = new Set(pythFeeds.map((f) => f.symbol));
    const additional = sixFallback.filter((f) => !pythSymbols.has(f.symbol));

    return {
      feeds: [...pythFeeds, ...additional],
      primarySource: "Pyth",
    };
  } catch (err) {
    console.warn("Pyth feed unavailable, using SIX BFI fallback:", err);
    return {
      feeds: getSixFallbackPrices(),
      primarySource: "SIX BFI",
    };
  }
}
