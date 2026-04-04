
CREATE TABLE public.price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset text NOT NULL DEFAULT 'XAU/USD',
  price numeric NOT NULL,
  source text NOT NULL DEFAULT 'SIX BFI',
  tx_signature text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_history_asset_created ON public.price_history (asset, created_at DESC);

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read price_history"
  ON public.price_history FOR SELECT
  TO anon USING (true);

CREATE POLICY "Service role insert price_history"
  ON public.price_history FOR INSERT
  TO service_role WITH CHECK (true);
