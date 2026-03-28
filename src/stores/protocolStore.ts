import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

const BOOTSTRAP_ADMIN = "BkR1BUvFmcV6nDYh3FsCEquLqy6KPQnzt6VEQY4Ydcry";

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
  wallet?: string;
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
  // Loading state
  initialized: boolean;
  initializeStore: () => Promise<void>;

  // Admin management
  adminWallets: string[];
  addAdmin: (wallet: string, addedBy?: string) => Promise<void>;
  removeAdmin: (wallet: string) => Promise<void>;
  isAdmin: (wallet: string | null) => boolean;

  // KYC Allowlist
  allowlist: string[];
  addToAllowlist: (wallet: string, addedBy?: string) => Promise<void>;
  removeFromAllowlist: (wallet: string) => Promise<void>;
  isOnAllowlist: (wallet: string | null) => boolean;

  // Allowlist requests
  allowlistRequests: AllowlistRequest[];
  requestAllowlist: (wallet: string) => Promise<void>;
  approveRequest: (wallet: string) => Promise<void>;
  rejectRequest: (wallet: string) => Promise<void>;
  hasRequestedAllowlist: (wallet: string | null) => boolean;

  // KYT events
  kytEvents: KytEvent[];
  addKytEvent: (event: KytEvent) => Promise<void>;

  // Transactions
  transactions: TransactionRecord[];
  addTransaction: (tx: TransactionRecord) => Promise<void>;

  // Vault tracking
  vaults: VaultEntry[];

  // Travel rule records
  travelRuleRecords: TravelRuleRecord[];
  addTravelRuleRecord: (record: TravelRuleRecord) => Promise<void>;

  // AML scores
  amlScores: Record<string, { score: number; reason: string }>;
  setAmlScore: (wallet: string, score: number, reason: string) => Promise<void>;
}

export const useProtocolStore = create<ProtocolState>((set, get) => ({
  initialized: false,

  initializeStore: async () => {
    if (get().initialized) return;

    // Load all data from Supabase in parallel
    const [adminsRes, allowlistRes, requestsRes, kytRes, txRes, amlRes, travelRes] = await Promise.all([
      supabase.from("admin_wallets").select("wallet_address"),
      supabase.from("allowlist").select("wallet_address"),
      supabase.from("allowlist_requests").select("*"),
      supabase.from("kyt_events").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("aml_scores").select("*"),
      supabase.from("travel_rule_records").select("*").order("created_at", { ascending: false }),
    ]);

    const adminWallets = (adminsRes.data ?? []).map((r: any) => r.wallet_address);
    const allowlist = (allowlistRes.data ?? []).map((r: any) => r.wallet_address);

    const allowlistRequests: AllowlistRequest[] = (requestsRes.data ?? []).map((r: any) => ({
      wallet: r.wallet_address,
      requestedAt: new Date(r.requested_at),
      status: r.status as "pending" | "approved" | "rejected",
      decidedAt: r.decided_at ? new Date(r.decided_at) : undefined,
    }));

    const kytEvents: KytEvent[] = (kytRes.data ?? []).map((r: any) => ({
      time: new Date(r.created_at),
      action: r.action,
      amount: r.amount,
      asset: r.asset,
      flagged: r.flagged,
      wallet: r.wallet_address,
    }));

    const transactions: TransactionRecord[] = (txRes.data ?? []).map((r: any) => ({
      id: r.id,
      type: r.type as "deposit" | "mint" | "burn",
      amount: Number(r.amount),
      unit: r.unit,
      txSignature: r.tx_signature,
      timestamp: new Date(r.created_at),
      status: r.status as "confirmed" | "pending" | "failed",
      wallet: r.wallet_address,
    }));

    const amlScores: Record<string, { score: number; reason: string }> = {};
    (amlRes.data ?? []).forEach((r: any) => {
      amlScores[r.wallet_address] = { score: r.score, reason: r.reason };
    });

    const travelRuleRecords: TravelRuleRecord[] = (travelRes.data ?? []).map((r: any) => ({
      id: r.id,
      amount: Number(r.amount),
      origVasp: r.orig_vasp,
      beneVasp: r.bene_vasp,
      timestamp: new Date(r.created_at),
      pda: r.pda,
    }));

    set({
      initialized: true,
      adminWallets,
      allowlist,
      allowlistRequests,
      kytEvents,
      transactions,
      amlScores,
      travelRuleRecords,
    });
  },

  adminWallets: [],
  addAdmin: async (wallet, addedBy) => {
    const state = get();
    if (state.adminWallets.includes(wallet)) return;
    await supabase.from("admin_wallets").insert({ wallet_address: wallet, added_by: addedBy ?? "admin" });
    set((s) => ({ adminWallets: [...s.adminWallets, wallet] }));
  },
  removeAdmin: async (wallet) => {
    if (wallet === BOOTSTRAP_ADMIN) return; // Cannot remove bootstrap admin
    await supabase.from("admin_wallets").delete().eq("wallet_address", wallet);
    set((s) => ({ adminWallets: s.adminWallets.filter((w) => w !== wallet) }));
  },
  isAdmin: (wallet) => {
    if (!wallet) return false;
    return get().adminWallets.includes(wallet);
  },

  allowlist: [],
  addToAllowlist: async (wallet, addedBy) => {
    const state = get();
    if (state.allowlist.includes(wallet)) return;
    await supabase.from("allowlist").insert({ wallet_address: wallet, added_by: addedBy ?? "admin" });
    set((s) => ({ allowlist: [...s.allowlist, wallet] }));
  },
  removeFromAllowlist: async (wallet) => {
    await supabase.from("allowlist").delete().eq("wallet_address", wallet);
    set((s) => ({ allowlist: s.allowlist.filter((w) => w !== wallet) }));
  },
  isOnAllowlist: (wallet) => {
    if (!wallet) return false;
    return get().allowlist.includes(wallet);
  },

  allowlistRequests: [],
  requestAllowlist: async (wallet) => {
    const exists = get().allowlistRequests.find((r) => r.wallet === wallet);
    if (exists) return;
    await supabase.from("allowlist_requests").insert({ wallet_address: wallet });
    set((s) => ({
      allowlistRequests: [
        ...s.allowlistRequests,
        { wallet, requestedAt: new Date(), status: "pending" as const },
      ],
    }));
  },
  approveRequest: async (wallet) => {
    await supabase.from("allowlist_requests").update({ status: "approved", decided_at: new Date().toISOString() }).eq("wallet_address", wallet);
    await supabase.from("allowlist").insert({ wallet_address: wallet, added_by: "admin_approval" });
    set((s) => ({
      allowlistRequests: s.allowlistRequests.map((r) =>
        r.wallet === wallet ? { ...r, status: "approved" as const, decidedAt: new Date() } : r
      ),
      allowlist: s.allowlist.includes(wallet) ? s.allowlist : [...s.allowlist, wallet],
    }));
  },
  rejectRequest: async (wallet) => {
    await supabase.from("allowlist_requests").update({ status: "rejected", decided_at: new Date().toISOString() }).eq("wallet_address", wallet);
    set((s) => ({
      allowlistRequests: s.allowlistRequests.map((r) =>
        r.wallet === wallet ? { ...r, status: "rejected" as const, decidedAt: new Date() } : r
      ),
    }));
  },
  hasRequestedAllowlist: (wallet) => {
    if (!wallet) return false;
    return get().allowlistRequests.some((r) => r.wallet === wallet);
  },

  kytEvents: [],
  addKytEvent: async (event) => {
    await supabase.from("kyt_events").insert({
      wallet_address: event.wallet,
      action: event.action,
      amount: event.amount,
      asset: event.asset,
      flagged: event.flagged,
    });
    set((s) => ({ kytEvents: [event, ...s.kytEvents] }));
  },

  transactions: [],
  addTransaction: async (tx) => {
    await supabase.from("transactions").insert({
      type: tx.type,
      wallet_address: tx.wallet ?? "unknown",
      amount: tx.amount,
      unit: tx.unit,
      tx_signature: tx.txSignature,
      status: tx.status,
    });
    set((s) => ({ transactions: [tx, ...s.transactions] }));
  },

  vaults: [],

  travelRuleRecords: [],
  addTravelRuleRecord: async (record) => {
    await supabase.from("travel_rule_records").insert({
      amount: record.amount,
      orig_vasp: record.origVasp,
      bene_vasp: record.beneVasp,
      pda: record.pda,
    });
    set((s) => ({ travelRuleRecords: [record, ...s.travelRuleRecords] }));
  },

  amlScores: {},
  setAmlScore: async (wallet, score, reason) => {
    await supabase.from("aml_scores").upsert({ wallet_address: wallet, score, reason, updated_at: new Date().toISOString() }, { onConflict: "wallet_address" });
    set((s) => ({ amlScores: { ...s.amlScores, [wallet]: { score, reason } } }));
  },
}));
