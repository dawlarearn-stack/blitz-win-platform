import { useCallback, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getTelegramId, generateFingerprint } from "@/lib/fingerprint";

const STORAGE_KEY = "pgr_game_data";

export interface GameProgress {
  gameId: string;
  currentLevel: number;
  highestLevel: number;
}

export interface Referral {
  id: string;
  username: string;
  gamesPlayed: number;
  joinedAt: number;
  claimed: boolean;
}

export interface UserData {
  points: number;
  energy: number;
  gamesPlayed: number;
  progress: Record<string, GameProgress>;
  referralCode: string;
  referrals: Referral[];
}

const defaultData: UserData = {
  points: 0,
  energy: 100,
  gamesPlayed: 0,
  progress: {},
  referralCode: "",
  referrals: [],
};

// Cache for fingerprint (computed once)
let _fingerprint: string | null = null;
function getFingerprint(): string {
  if (!_fingerprint) _fingerprint = generateFingerprint();
  return _fingerprint;
}

export function useGameStore() {
  const [data, setData] = useState<UserData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const telegramId = useRef(getTelegramId());

  // Load state from server on mount
  useEffect(() => {
    const loadServerState = async () => {
      try {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const resp = await fetch(`${baseUrl}/functions/v1/get-game-state`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${anonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ telegram_id: telegramId.current }),
        });
        const result = await resp.json();
        if (resp.ok) {
          setData({
            points: result.points ?? 0,
            energy: result.energy ?? 100,
            gamesPlayed: result.games_played ?? 0,
            progress: result.progress ?? {},
            referralCode: result.referral_code ?? "",
            referrals: [], // referrals handled separately
          });
          // Also cache locally for offline display
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            points: result.points,
            energy: result.energy,
            gamesPlayed: result.games_played,
            progress: result.progress,
            referralCode: result.referral_code,
          }));
        } else {
          // Fallback to localStorage
          loadLocalData();
        }
      } catch {
        loadLocalData();
      }
      setLoading(false);
    };

    const loadLocalData = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setData({ ...defaultData, ...parsed, referrals: parsed.referrals || [] });
        }
      } catch {}
    };

    loadServerState();
  }, []);

  // Server API: start a level (deducts energy server-side)
  const startLevel = useCallback(async (gameId: string, level: number): Promise<boolean> => {
    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const resp = await fetch(`${baseUrl}/functions/v1/start-level`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telegram_id: telegramId.current,
          game_id: gameId,
          level,
          fingerprint: getFingerprint(),
          user_agent: navigator.userAgent,
        }),
      });
      const result = await resp.json();

      if (!resp.ok) {
        if (result.error?.includes("energy")) {
          toast.error("Energy မလုံလောက်ပါ!", { description: "Shop မှာ Energy ဝယ်ပါ ⚡" });
        } else if (resp.status === 429) {
          toast.error("Too many requests! ခဏစောင့်ပါ");
        } else {
          toast.error(result.error || "Failed to start level");
        }
        return false;
      }

      setActiveSession(result.session_id);
      setData(prev => ({
        ...prev,
        energy: result.energy,
        points: result.points,
      }));
      return true;
    } catch (err) {
      console.error("startLevel error:", err);
      toast.error("Server error. ထပ်ကြိုးစားပါ");
      return false;
    }
  }, []);

  // Server API: complete a level (awards points server-side)
  const completeLevel = useCallback(async (gameId: string, level: number, won: boolean): Promise<number> => {
    if (!activeSession) {
      console.error("No active session to complete");
      return 0;
    }

    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const resp = await fetch(`${baseUrl}/functions/v1/complete-level`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telegram_id: telegramId.current,
          session_id: activeSession,
          game_id: gameId,
          level,
          won,
        }),
      });
      const result = await resp.json();

      if (!resp.ok) {
        console.error("completeLevel error:", result.error);
        return 0;
      }

      setActiveSession(null);
      setData(prev => ({
        ...prev,
        points: result.points ?? prev.points,
        energy: result.energy ?? prev.energy,
        progress: result.progress ?? prev.progress,
        gamesPlayed: prev.gamesPlayed + 1,
      }));

      // Update local cache
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        points: result.points,
        energy: result.energy,
        progress: result.progress,
        gamesPlayed: data.gamesPlayed + 1,
        referralCode: data.referralCode,
      }));

      return result.points_awarded ?? 0;
    } catch (err) {
      console.error("completeLevel error:", err);
      return 0;
    }
  }, [activeSession, data.gamesPlayed, data.referralCode]);

  // Local-only convenience methods (for non-critical UI updates)
  const addPoints = useCallback((_amount: number) => {
    // Points are now managed server-side via completeLevel
    // This is a no-op kept for backward compatibility
  }, []);

  const addEnergy = useCallback((amount: number) => {
    setData(prev => ({ ...prev, energy: prev.energy + amount }));
  }, []);

  const spendPoints = useCallback((amount: number): boolean => {
    if (data.points < amount) return false;
    setData(prev => ({ ...prev, points: prev.points - amount }));
    return true;
  }, [data.points]);

  const spendEnergy = useCallback((_amount: number = 1): boolean => {
    // Energy spending is now done server-side via startLevel
    // This returns true to maintain backward compat but doesn't deduct locally
    return true;
  }, []);

  const updateProgress = useCallback((_gameId: string, _level: number) => {
    // Progress is now updated server-side via completeLevel
  }, []);

  const claimReferral = useCallback((referralId: string) => {
    setData(prev => {
      const referral = prev.referrals.find(r => r.id === referralId);
      if (!referral || referral.claimed) return prev;
      const daysSinceJoin = (Date.now() - referral.joinedAt) / (1000 * 60 * 60 * 24);
      if (referral.gamesPlayed < 50 || daysSinceJoin < 3) return prev;
      return {
        ...prev,
        points: prev.points + 1000,
        energy: prev.energy + 100,
        referrals: prev.referrals.map(r =>
          r.id === referralId ? { ...r, claimed: true } : r
        ),
      };
    });
  }, []);

  // Refresh state from server
  const refreshState = useCallback(async () => {
    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const resp = await fetch(`${baseUrl}/functions/v1/get-game-state`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ telegram_id: telegramId.current }),
      });
      const result = await resp.json();
      if (resp.ok) {
        setData(prev => ({
          ...prev,
          points: result.points ?? prev.points,
          energy: result.energy ?? prev.energy,
          gamesPlayed: result.games_played ?? prev.gamesPlayed,
          progress: result.progress ?? prev.progress,
          referralCode: result.referral_code ?? prev.referralCode,
        }));
      }
    } catch {}
  }, []);

  return {
    data,
    loading,
    addPoints,
    addEnergy,
    spendPoints,
    spendEnergy,
    updateProgress,
    claimReferral,
    startLevel,
    completeLevel,
    refreshState,
  };
}

export function getPointsDollarValue(points: number): string {
  return (points / 100000).toFixed(2);
}
