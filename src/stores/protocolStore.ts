import { create } from "zustand";

export interface AllowlistRequest {
  wallet: string;
  requestedAt: Date;
  status: "pending" | "approved" | "rejected";
  decidedAt?: Date;
}

export interface KytEvent {
  time: Date;
  action: string;
  amount: string;
  asset: string;
  flagged: boolean;
  wallet: string;
}

export interface TransactionRecord {
  id: string;
  type: "deposit" | "mint" | "burn";
  amount: number;
  unit: string;
  txSignature: string;
  timestamp: Date;
  status: "confirmed" | "pending" | "failed";
}

export interface VaultEntry {
  wallet: string;
  collateralOz: number;
  xusdDebt: number;
  collateralRatio: number;
  health: string;
}

export interface TravelRuleRecord {
  id: string;
  amount: number;
  origVasp: string;
  beneVasp: string;
  timestamp: Date;
  pda: string;
}

interface ProtocolState {
  // Admin management
  adminWallets: string[];
  addAdmin: (wallet: string) => void;
  removeAdmin: (wallet: string) => void;
  isAdmin: (wallet: string | null) => boolean;

  // KYC Allowlist
  allowlist: string[];
  addToAllowlist: (wallet: string) => void;
  removeFromAllowlist: (wallet: string) => void;
  isOnAllowlist: (wallet: string | null) => boolean;

  // Allowlist requests
  allowlistRequests: AllowlistRequest[];
  requestAllowlist: (wallet: string) => void;
  approveRequest: (wallet: string) => void;
  rejectRequest: (wallet: string) => void;
  hasRequestedAllowlist: (wallet: string | null) => boolean;

  // KYT events
  kytEvents: KytEvent[];
  addKytEvent: (event: KytEvent) => void;

  // Transactions
  transactions: TransactionRecord[];
  addTransaction: (tx: TransactionRecord) => void;

  // Vault tracking (other vaults for liquidation monitoring)
  vaults: VaultEntry[];

  // Travel rule records
  travelRuleRecords: TravelRuleRecord[];
  addTravelRuleRecord: (record: TravelRuleRecord) => void;

  // AML scores
  amlScores: Record<string, { score: number; reason: string }>;
  setAmlScore: (wallet: string, score: number, reason: string) => void;
}

export const useProtocolStore = create<ProtocolState>((set, get) => ({
  // Initial admin is empty — first connected wallet can bootstrap
  adminWallets: [],
  addAdmin: (wallet) =>
    set((s) => ({
      adminWallets: s.adminWallets.includes(wallet) ? s.adminWallets : [...s.adminWallets, wallet],
    })),
  removeAdmin: (wallet) =>
    set((s) => ({ adminWallets: s.adminWallets.filter((w) => w !== wallet) })),
  isAdmin: (wallet) => {
    if (!wallet) return false;
    const state = get();
    // If no admins exist, the first connected wallet becomes admin
    if (state.adminWallets.length === 0) return false;
    return state.adminWallets.includes(wallet);
  },

  allowlist: [],
  addToAllowlist: (wallet) =>
    set((s) => ({
      allowlist: s.allowlist.includes(wallet) ? s.allowlist : [...s.allowlist, wallet],
    })),
  removeFromAllowlist: (wallet) =>
    set((s) => ({ allowlist: s.allowlist.filter((w) => w !== wallet) })),
  isOnAllowlist: (wallet) => {
    if (!wallet) return false;
    return get().allowlist.includes(wallet);
  },

  allowlistRequests: [],
  requestAllowlist: (wallet) =>
    set((s) => {
      const exists = s.allowlistRequests.find((r) => r.wallet === wallet);
      if (exists) return s;
      return {
        allowlistRequests: [
          ...s.allowlistRequests,
          { wallet, requestedAt: new Date(), status: "pending" as const },
        ],
      };
    }),
  approveRequest: (wallet) =>
    set((s) => ({
      allowlistRequests: s.allowlistRequests.map((r) =>
        r.wallet === wallet ? { ...r, status: "approved" as const, decidedAt: new Date() } : r
      ),
      allowlist: s.allowlist.includes(wallet) ? s.allowlist : [...s.allowlist, wallet],
    })),
  rejectRequest: (wallet) =>
    set((s) => ({
      allowlistRequests: s.allowlistRequests.map((r) =>
        r.wallet === wallet ? { ...r, status: "rejected" as const, decidedAt: new Date() } : r
      ),
    })),
  hasRequestedAllowlist: (wallet) => {
    if (!wallet) return false;
    return get().allowlistRequests.some((r) => r.wallet === wallet);
  },

  kytEvents: [],
  addKytEvent: (event) => set((s) => ({ kytEvents: [event, ...s.kytEvents] })),

  transactions: [],
  addTransaction: (tx) => set((s) => ({ transactions: [tx, ...s.transactions] })),

  vaults: [],

  travelRuleRecords: [],
  addTravelRuleRecord: (record) =>
    set((s) => ({ travelRuleRecords: [record, ...s.travelRuleRecords] })),

  amlScores: {},
  setAmlScore: (wallet, score, reason) =>
    set((s) => ({ amlScores: { ...s.amlScores, [wallet]: { score, reason } } })),
}));
