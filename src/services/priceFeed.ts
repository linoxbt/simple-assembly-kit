/**
 * Price Feed Service — reads XAU/USD price from on-chain PriceAccount PDA.
 * Falls back to Pyth Hermes API if on-chain price is not initialised.
 * SIX BFI oracle writes prices on-chain via the keeper; we read from the PDA.
 */
import { fetchPriceAccount } from "@/services/anchorProgram";

export interface PriceFeedData {
  symbol: string;
  price: number;
  confidence: number;
  source: "On-Chain" | "SIX BFI" | "Pyth" | "Unavailable";
  updatedAt: Date;
  isStale: boolean;
}

// Pyth Hermes fallback
const PYTH_FEED_IDS: Record<string, string> = {
  "XAU/USD": "0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2",
  "XAG/USD": "0xf2fb02c32b055c805e7238d628e5e9dadef274376114eb1f012337cabe93871e",
};
const PYTH_HERMES_URL = "https://hermes.pyth.network/v2/updates/price/latest";

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
    return {
      symbol: symbols[i],
      price,
      confidence,
      source: "Pyth" as const,
      updatedAt,
      isStale: Date.now() - updatedAt.getTime() > 120_000,
    };
  });
}

/**
 * Fetch prices: first try on-chain PriceAccount, fallback to Pyth.
 */
export async function fetchPrices(): Promise<{
  feeds: PriceFeedData[];
  primarySource: "On-Chain" | "SIX BFI" | "Pyth";
}> {
  // Try on-chain first
  try {
    const onChainPrice = await fetchPriceAccount("XAU/USD");
    if (onChainPrice && onChainPrice.price > 0) {
      const feeds: PriceFeedData[] = [
        {
          symbol: "XAU/USD",
          price: onChainPrice.price,
          confidence: 0.05,
          source: "On-Chain",
          updatedAt: new Date(onChainPrice.publishedAt * 1000),
          isStale: onChainPrice.isStale,
        },
      ];
      return { feeds, primarySource: "On-Chain" };
    }
  } catch (err) {
    console.warn("On-chain price unavailable:", err);
  }

  // Fallback to Pyth
  try {
    const pythFeeds = await fetchPythPrices();
    return { feeds: pythFeeds, primarySource: "Pyth" };
  } catch (err) {
    console.warn("Pyth also unavailable:", err);
    return {
      feeds: [{
        symbol: "XAU/USD",
        price: 0,
        confidence: 0,
        source: "Unavailable" as any,
        updatedAt: new Date(),
        isStale: true,
      }],
      primarySource: "Pyth",
    };
  }
}
