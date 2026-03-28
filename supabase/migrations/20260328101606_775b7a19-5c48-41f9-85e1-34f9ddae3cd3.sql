
-- Admin wallets table
CREATE TABLE public.admin_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  added_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- KYC Allowlist table
CREATE TABLE public.allowlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  added_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Allowlist requests table
CREATE TABLE public.allowlist_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  decided_at TIMESTAMP WITH TIME ZONE
);

-- KYT Events table
CREATE TABLE public.kyt_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  action TEXT NOT NULL,
  amount TEXT NOT NULL,
  asset TEXT NOT NULL,
  flagged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Transaction records table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'mint', 'burn')),
  wallet_address TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  tx_signature TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AML scores table
CREATE TABLE public.aml_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  score INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT 'CLEAN',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Travel rule records table
CREATE TABLE public.travel_rule_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL,
  orig_vasp TEXT NOT NULL,
  bene_vasp TEXT NOT NULL,
  pda TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.admin_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowlist_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyt_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aml_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_rule_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies: App uses Solana wallet auth, not Supabase auth
CREATE POLICY "Allow public read admin_wallets" ON public.admin_wallets FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert admin_wallets" ON public.admin_wallets FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon delete admin_wallets" ON public.admin_wallets FOR DELETE TO anon USING (true);

CREATE POLICY "Allow public read allowlist" ON public.allowlist FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert allowlist" ON public.allowlist FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon delete allowlist" ON public.allowlist FOR DELETE TO anon USING (true);

CREATE POLICY "Allow public read allowlist_requests" ON public.allowlist_requests FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert allowlist_requests" ON public.allowlist_requests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update allowlist_requests" ON public.allowlist_requests FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read kyt_events" ON public.kyt_events FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert kyt_events" ON public.kyt_events FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow public read transactions" ON public.transactions FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert transactions" ON public.transactions FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow public read aml_scores" ON public.aml_scores FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon upsert aml_scores" ON public.aml_scores FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update aml_scores" ON public.aml_scores FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read travel_rule_records" ON public.travel_rule_records FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert travel_rule_records" ON public.travel_rule_records FOR INSERT TO anon WITH CHECK (true);

-- Seed the bootstrap admin
INSERT INTO public.admin_wallets (wallet_address, added_by) VALUES ('BkR1BUvFmcV6nDYh3FsCEquLqy6KPQnzt6VEQY4Ydcry', 'bootstrap');
