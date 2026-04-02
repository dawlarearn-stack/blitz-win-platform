
CREATE TABLE public.banned_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id text NOT NULL UNIQUE,
  reason text,
  banned_at timestamp with time zone NOT NULL DEFAULT now(),
  banned_by text,
  unbanned_at timestamp with time zone
);

ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on banned_users"
  ON public.banned_users FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can read banned_users"
  ON public.banned_users FOR SELECT TO anon, authenticated
  USING (true);
