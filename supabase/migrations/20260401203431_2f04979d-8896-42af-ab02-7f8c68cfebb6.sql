
-- User game state: server-side points, energy, progress
CREATE TABLE public.user_game_state (
  telegram_id TEXT PRIMARY KEY,
  points INTEGER NOT NULL DEFAULT 0,
  energy INTEGER NOT NULL DEFAULT 100,
  games_played INTEGER NOT NULL DEFAULT 0,
  progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  referral_code TEXT NOT NULL DEFAULT ('PGR-' || upper(substr(md5(random()::text), 1, 6))),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_game_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read own game state" ON public.user_game_state
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Service role full access on user_game_state" ON public.user_game_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Game sessions: tracks active game sessions for anti-cheat
CREATE TABLE public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active',
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on game_sessions" ON public.game_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users can read own sessions" ON public.game_sessions
  FOR SELECT TO anon, authenticated USING (true);

-- Suspicious activity log
CREATE TABLE public.suspicious_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  device_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suspicious_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on suspicious_activity" ON public.suspicious_activity
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Device fingerprints for multi-account detection
CREATE TABLE public.device_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on device_fingerprints" ON public.device_fingerprints
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_game_sessions_telegram ON public.game_sessions(telegram_id, status);
CREATE INDEX idx_game_sessions_started ON public.game_sessions(started_at);
CREATE INDEX idx_suspicious_activity_telegram ON public.suspicious_activity(telegram_id);
CREATE INDEX idx_suspicious_activity_created ON public.suspicious_activity(created_at DESC);
CREATE INDEX idx_device_fingerprints_fp ON public.device_fingerprints(fingerprint);
CREATE INDEX idx_device_fingerprints_telegram ON public.device_fingerprints(telegram_id);
