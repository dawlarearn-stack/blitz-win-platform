import { useState, useCallback } from "react";

// Simple client-side store for points and game progress
// Will be replaced with Supabase backend later

const STORAGE_KEY = "pgr_game_data";

export interface GameProgress {
  gameId: string;
  currentLevel: number;
  highestLevel: number;
}

export interface UserData {
  points: number;
  energy: number;
  gamesPlayed: number;
  progress: Record<string, GameProgress>;
}

function loadData(): UserData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { points: 0, energy: 100, gamesPlayed: 0, progress: {} };
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

  return { data, addPoints, addEnergy, spendPoints, updateProgress };
}

export function getPointsDollarValue(points: number): string {
  return (points / 100000).toFixed(2);
}
