
-- Drop overly permissive policies on admin_wallets
DROP POLICY IF EXISTS "Allow anon delete admin_wallets" ON public.admin_wallets;
DROP POLICY IF EXISTS "Allow anon insert admin_wallets" ON public.admin_wallets;

-- Drop overly permissive policies on allowlist
DROP POLICY IF EXISTS "Allow anon delete allowlist" ON public.allowlist;
DROP POLICY IF EXISTS "Allow anon insert allowlist" ON public.allowlist;

-- Create a security definer function to check if a wallet is admin
CREATE OR REPLACE FUNCTION public.is_admin_wallet(wallet text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_wallets WHERE wallet_address = wallet
  )
$$;

-- admin_wallets: only admins can insert/delete (verified via edge function)
-- For now, restrict to service_role only for writes
CREATE POLICY "Service role insert admin_wallets"
  ON public.admin_wallets FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role delete admin_wallets"
  ON public.admin_wallets FOR DELETE
  TO service_role
  USING (true);

-- allowlist: only service_role can insert/delete
CREATE POLICY "Service role insert allowlist"
  ON public.allowlist FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role delete allowlist"
  ON public.allowlist FOR DELETE
  TO service_role
  USING (true);

-- allowlist_requests: keep anon insert (anyone can request) but restrict update to service_role
DROP POLICY IF EXISTS "Allow anon update allowlist_requests" ON public.allowlist_requests;

CREATE POLICY "Service role update allowlist_requests"
  ON public.allowlist_requests FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- aml_scores: restrict writes to service_role
DROP POLICY IF EXISTS "Allow anon update aml_scores" ON public.aml_scores;
DROP POLICY IF EXISTS "Allow anon upsert aml_scores" ON public.aml_scores;

CREATE POLICY "Service role insert aml_scores"
  ON public.aml_scores FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role update aml_scores"
  ON public.aml_scores FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
