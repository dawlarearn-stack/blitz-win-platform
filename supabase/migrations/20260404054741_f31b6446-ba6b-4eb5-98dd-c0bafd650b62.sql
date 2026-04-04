
CREATE TABLE public.daily_rewards_state (
  telegram_id TEXT NOT NULL PRIMARY KEY,
  last_checkin_date TEXT NOT NULL DEFAULT '',
  checkin_streak INTEGER NOT NULL DEFAULT 0,
  claimed_days JSONB NOT NULL DEFAULT '[]'::jsonb,
  level_tasks_claimed JSONB NOT NULL DEFAULT '[]'::jsonb,
  ad_progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  ad_claimed JSONB NOT NULL DEFAULT '[]'::jsonb,
  ad_last_watch JSONB NOT NULL DEFAULT '{}'::jsonb,
  reset_date TEXT NOT NULL DEFAULT '',
  free_energy_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_rewards_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read daily_rewards_state" ON public.daily_rewards_state
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Service role full access on daily_rewards_state" ON public.daily_rewards_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);
