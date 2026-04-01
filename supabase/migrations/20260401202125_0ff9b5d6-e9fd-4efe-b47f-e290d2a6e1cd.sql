
-- Bot users table (tracks who joined the bot)
CREATE TABLE public.bot_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id text UNIQUE NOT NULL,
  username text,
  first_name text,
  joined_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bot_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on bot_users" ON public.bot_users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can read bot_users count" ON public.bot_users FOR SELECT TO anon, authenticated USING (true);

-- User heartbeats for online tracking
CREATE TABLE public.user_heartbeats (
  telegram_id text PRIMARY KEY,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_heartbeats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on user_heartbeats" ON public.user_heartbeats FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can read heartbeats" ON public.user_heartbeats FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can upsert heartbeats" ON public.user_heartbeats FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update heartbeats" ON public.user_heartbeats FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- App configuration table for dynamic pricing
CREATE TABLE public.app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read app_config" ON public.app_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Service role full access on app_config" ON public.app_config FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Telegram bot state for polling offset
CREATE TABLE public.telegram_bot_state (
  id int PRIMARY KEY CHECK (id = 1),
  update_offset bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on telegram_bot_state" ON public.telegram_bot_state FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed bot state
INSERT INTO public.telegram_bot_state (id, update_offset) VALUES (1, 0);

-- Seed default energy pricing config
INSERT INTO public.app_config (key, value) VALUES 
('energy_packs', '[{"energy":1300,"priceUSD":"$1","priceMMK":"4,500 KS"},{"energy":4200,"priceUSD":"$3","priceMMK":"12,900 KS"},{"energy":7500,"priceUSD":"$5","priceMMK":"19,900 KS"},{"energy":17000,"priceUSD":"$10","priceMMK":"38,900 KS"}]'::jsonb),
('point_conversions', '[{"energy":50,"pointsCost":3000},{"energy":100,"pointsCost":5500},{"energy":200,"pointsCost":10000},{"energy":500,"pointsCost":24000}]'::jsonb);
