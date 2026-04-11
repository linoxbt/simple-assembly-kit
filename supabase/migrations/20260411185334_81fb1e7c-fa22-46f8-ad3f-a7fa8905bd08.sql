
-- Protocol settings table (single-row config)
CREATE TABLE public.protocol_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kyc_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by text
);

ALTER TABLE public.protocol_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Allow public read protocol_settings"
  ON public.protocol_settings FOR SELECT
  USING (true);

-- Only service_role can modify
CREATE POLICY "Service role update protocol_settings"
  ON public.protocol_settings FOR UPDATE
  TO service_role
  USING (true) WITH CHECK (true);

-- Insert initial row with KYC disabled (as user requested)
INSERT INTO public.protocol_settings (kyc_enabled, updated_by)
VALUES (false, 'system_init');
