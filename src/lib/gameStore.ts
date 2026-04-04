import { useCallback, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { getTelegramId, generateFingerprint } from "@/lib/fingerprint";
import { apiPost } from "@/lib/api";

function getStorageKey(): string {
  return `pgr_game_data_${getTelegramId()}`;
}

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
  energy: 1000,
  gamesPlayed: 0,
  progress: {},
  referralCode: "",
  referrals: [],
};

let _fingerprint: string | null = null;
function getFingerprint(): string {
  if (!_fingerprint) _fingerprint = generateFingerprint();
  return _fingerprint;
}

export function useGameStore() {
  const [data, setData] = useState<UserData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [startingLevel, setStartingLevel] = useState(false);
  const telegramId = useRef(getTelegramId());

  useEffect(() => {
    const loadServerState = async () => {
      try {
        const result = await apiPost("get-game-state", { telegram_id: telegramId.current });
        setData({
          points: result.points ?? 0,
          energy: result.energy ?? 1000,
          gamesPlayed: result.games_played ?? 0,
          progress: result.progress ?? {},
          referralCode: result.referral_code ?? "",
          referrals: (result.referrals || []).map((r: any) => ({
            id: r.id,
            username: r.username,
            gamesPlayed: r.gamesPlayed,
            joinedAt: r.joinedAt,
            claimed: r.claimed,
          })),
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          points: result.points,
          energy: result.energy,
          gamesPlayed: result.games_played,
          progress: result.progress,
          referralCode: result.referral_code,
        }));
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

  const startLevel = useCallback(async (gameId: string, level: number): Promise<boolean> => {
    if (startingLevel) return false;
    setStartingLevel(true);
    try {
      const result = await apiPost("start-level", {
        telegram_id: telegramId.current,
        game_id: gameId,
        level,
        fingerprint: getFingerprint(),
        user_agent: navigator.userAgent,
      });

      setActiveSession(result.session_id);
      setData(prev => ({
        ...prev,
        energy: result.energy,
        points: result.points,
      }));
      return true;
    } catch (err: any) {
      if (err.data?.error?.includes("energy")) {
        toast.error("Energy မလုံလောက်ပါ!", { description: "Shop မှာ Energy ဝယ်ပါ ⚡" });
      } else if (err.status === 429) {
        toast.error("Too many requests! ခဏစောင့်ပါ");
      } else {
        toast.error(err.data?.error || "Failed to start level");
      }
      return false;
    } finally {
      setStartingLevel(false);
    }
  }, [startingLevel]);

  const completeLevel = useCallback(async (gameId: string, level: number, won: boolean): Promise<number> => {
    if (!activeSession) {
      console.error("No active session to complete");
      return 0;
    }

    try {
      const result = await apiPost("complete-level", {
        telegram_id: telegramId.current,
        session_id: activeSession,
        game_id: gameId,
        level,
        won,
      });

      setActiveSession(null);
      setData(prev => ({
        ...prev,
        points: result.points ?? prev.points,
        energy: result.energy ?? prev.energy,
        progress: result.progress ?? prev.progress,
        gamesPlayed: prev.gamesPlayed + 1,
      }));

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

  const addPoints = useCallback((_amount: number) => {}, []);

  const addEnergy = useCallback((amount: number) => {
    setData(prev => ({ ...prev, energy: prev.energy + amount }));
  }, []);

  const spendPoints = useCallback((amount: number): boolean => {
    if (data.points < amount) return false;
    setData(prev => ({ ...prev, points: prev.points - amount }));
    return true;
  }, [data.points]);

  const spendEnergy = useCallback((_amount: number = 1): boolean => {
    return true;
  }, []);

  const updateProgress = useCallback((_gameId: string, _level: number) => {}, []);

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

  const refreshState = useCallback(async () => {
    try {
      const result = await apiPost("get-game-state", { telegram_id: telegramId.current });
      setData(prev => ({
        ...prev,
        points: result.points ?? prev.points,
        energy: result.energy ?? prev.energy,
        gamesPlayed: result.games_played ?? prev.gamesPlayed,
        progress: result.progress ?? prev.progress,
        referralCode: result.referral_code ?? prev.referralCode,
      }));
    } catch {}
  }, []);

  return {
    data,
    loading,
    startingLevel,
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
