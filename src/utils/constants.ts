export const AURUMX_PROGRAM_ID = "[REPLACE_AFTER_DEPLOY]";
export const HOOK_PROGRAM_ID = "[REPLACE_AFTER_DEPLOY]";
export const XUSD_MINT = "[REPLACE_AFTER_DEPLOY]";
export const COLLATERAL_MINT = "[REPLACE_AFTER_DEPLOY]";

export const SOLANA_NETWORK = "devnet";
export const RPC_URL = "https://api.devnet.solana.com";

export const MINT_RATIO_BPS = 15_000;
export const LIQUIDATION_RATIO_BPS = 12_000;
export const LIQUIDATION_BONUS_BPS = 500;
export const TRAVEL_RULE_THRESHOLD = 3_000;
export const KYT_FLAG_THRESHOLD = 10_000;
export const MAX_PRICE_STALENESS_SECS = 60;
export const TOKEN_DECIMALS = 6;

export const SIX_IDS: Record<string, string> = {
  "XAU/USD": "274702_148",
  "XAG/USD": "274720_148",
  "XPT/USD": "287635_148",
  "XPD/USD": "283501_148",
};

export const AML_REASONS = [
  "CLEAN",
  "MIXER_EXPOSURE",
  "SANCTIONED_COUNTERPARTY",
  "HIGH_RISK_JURISDICTION",
  "FRAUD_FLAG",
  "MANUAL_REVIEW",
] as const;

export type AmlReason = (typeof AML_REASONS)[number];
export type HealthStatus = "healthy" | "warning" | "danger" | "liquidated" | "empty";
