import { useState, useCallback } from "react";
import { toast } from "sonner";

// Simple client-side store for points and game progress
// Will be replaced with Supabase backend later

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
  joinedAt: number; // timestamp
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

function generateReferralCode(): string {
  return "PGR-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function loadData(): UserData {
  const defaults: UserData = {
    points: 0,
    energy: 100,
    gamesPlayed: 0,
    progress: {},
    referralCode: generateReferralCode(),
    referrals: [],
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure referralCode exists for old users
      if (!parsed.referralCode) parsed.referralCode = generateReferralCode();
      if (!parsed.referrals) parsed.referrals = [];
      return { ...defaults, ...parsed };
    }
  } catch {}
  return defaults;
}

function saveData(data: UserData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useGameStore() {
  const [data, setData] = useState<UserData>(loadData);

  const addPoints = useCallback((amount: number) => {
    setData((prev) => {
      const next = { ...prev, points: prev.points + amount };
      saveData(next);
      return next;
    });
  }, []);

  const updateProgress = useCallback((gameId: string, level: number) => {
    setData((prev) => {
      const existing = prev.progress[gameId] || { gameId, currentLevel: 0, highestLevel: 0 };
      const next = {
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1,
        progress: {
          ...prev.progress,
          [gameId]: {
            ...existing,
            currentLevel: level,
            highestLevel: Math.max(existing.highestLevel, level),
          },
        },
      };
      saveData(next);
      return next;
    });
  }, []);

  const addEnergy = useCallback((amount: number) => {
    setData((prev) => {
      const next = { ...prev, energy: prev.energy + amount };
      saveData(next);
      return next;
    });
  }, []);

  const spendPoints = useCallback((amount: number): boolean => {
    let success = false;
    setData((prev) => {
      if (prev.points < amount) return prev;
      success = true;
      const next = { ...prev, points: prev.points - amount };
      saveData(next);
      return next;
    });
    return success;
  }, []);

  const spendEnergy = useCallback((amount: number = 1): boolean => {
    let success = false;
    setData((prev) => {
      if (prev.energy < amount) return prev;
      success = true;
      const next = { ...prev, energy: prev.energy - amount };
      saveData(next);
      return next;
    });
    if (!success) {
      toast.error("Energy မလုံလောက်ပါ!", { description: "Shop မှာ Energy ဝယ်ပါ ⚡" });
    }
    return success;
  }, []);

  const claimReferral = useCallback((referralId: string) => {
    setData((prev) => {
      const referral = prev.referrals.find((r) => r.id === referralId);
      if (!referral || referral.claimed) return prev;
      const daysSinceJoin = (Date.now() - referral.joinedAt) / (1000 * 60 * 60 * 24);
      if (referral.gamesPlayed < 50 || daysSinceJoin < 3) return prev;
      const next = {
        ...prev,
        points: prev.points + 1000,
        energy: prev.energy + 100,
        referrals: prev.referrals.map((r) =>
          r.id === referralId ? { ...r, claimed: true } : r
        ),
      };
      saveData(next);
      return next;
    });
  }, []);

  return { data, addPoints, addEnergy, spendPoints, spendEnergy, updateProgress, claimReferral };
}

export function getPointsDollarValue(points: number): string {
  return (points / 100000).toFixed(2);
}
