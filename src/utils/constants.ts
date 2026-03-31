export const AURUMX_PROGRAM_ID = "7YWWyNwtHSKHoxNm5fw2Sh73QRcFPUzCQ7qntJM7HgnG";
export const HOOK_PROGRAM_ID = "ECqCrLVeHRfKbXQkYoNt9ci7bdRc4k1jLJZWt2Ds";
export const XUSD_MINT = "8BAHWKUJZxXt4qafmJcQBGbEk77aqxoWyYoNZwp6EorS";
export const COLLATERAL_MINT = "6iEUnETuLah7aumoqgv8nzhfUS965YebwYFSoUmg8qpu";

// Token accounts for the deployer wallet
export const COLLATERAL_TOKEN_ACCOUNT = "EzA8GqQdk39BJzcrD8ZJkC9VaF1LqpqgnJ3Me3W1hGyV";
export const XUSD_TOKEN_ACCOUNT = "AgEXH3r2eKHcP5cAKjpeNiRGTBeTpeWbSMQFQJQJtnqk";

export const SOLANA_NETWORK = "devnet";
export const RPC_URL = "https://api.devnet.solana.com";

export const MINT_RATIO_BPS = 15_000;
export const LIQUIDATION_RATIO_BPS = 12_000;
export const LIQUIDATION_BONUS_BPS = 500;
export const TRAVEL_RULE_THRESHOLD = 3_000;
export const KYT_FLAG_THRESHOLD = 10_000;
export const MAX_PRICE_STALENESS_SECS = 60;
export const TOKEN_DECIMALS = 6;

// Token-2022 program
export const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

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
