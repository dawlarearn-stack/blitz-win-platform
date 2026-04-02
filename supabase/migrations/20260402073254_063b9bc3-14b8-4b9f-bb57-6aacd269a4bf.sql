
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_telegram_id text NOT NULL,
  referred_telegram_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed boolean NOT NULL DEFAULT false,
  claimed_at timestamptz,
  UNIQUE(referred_telegram_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on referrals" ON public.referrals FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can read referrals" ON public.referrals FOR SELECT TO anon, authenticated USING (true);
