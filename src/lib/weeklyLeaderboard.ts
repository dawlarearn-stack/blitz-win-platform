import { useState, useEffect } from "react";

const WEEKLY_LB_KEY = "pgr_weekly_lb";

export interface WeeklyInviter {
  rank: number;
  name: string;
  invites: number;
}

export interface WeeklyLeaderboardData {
  weekStartTimestamp: number;
  weekEndTimestamp: number;
  lastRewardedWeek: number; // weekStartTimestamp of last rewarded week
}

export const WEEKLY_REWARDS: Record<number, number> = {
  1: 20000,
  2: 15000,
  3: 10000,
};
// Ranks 4-10 get 5000
for (let i = 4; i <= 10; i++) WEEKLY_REWARDS[i] = 5000;

function getWeekBoundaries(): { start: number; end: number } {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun
  const diff = day === 0 ? 6 : day - 1; // shift to Monday start
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - diff);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start: start.getTime(), end: end.getTime() };
}

function loadWeeklyData(): WeeklyLeaderboardData {
  const { start, end } = getWeekBoundaries();
  const defaults: WeeklyLeaderboardData = {
    weekStartTimestamp: start,
    weekEndTimestamp: end,
    lastRewardedWeek: 0,
  };
  try {
    const raw = localStorage.getItem(WEEKLY_LB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // If stored week is outdated, start new cycle
      if (parsed.weekStartTimestamp !== start) {
        // Check if we need to distribute rewards for the old week
        const needsReward = parsed.lastRewardedWeek !== parsed.weekStartTimestamp;
        return { ...defaults, lastRewardedWeek: needsReward ? parsed.lastRewardedWeek : parsed.weekStartTimestamp };
      }
      return { ...defaults, ...parsed };
    }
  } catch {}
  return defaults;
}

function saveWeeklyData(data: WeeklyLeaderboardData) {
  localStorage.setItem(WEEKLY_LB_KEY, JSON.stringify(data));
}

// Generate mock weekly inviters (simulating weekly data)
export function getWeeklyInviters(): WeeklyInviter[] {
  const { start } = getWeekBoundaries();
  // Use week start as seed for consistent mock data within the same week
  const seed = start % 10000;
  const names = [
    "moonK", "playerX", "gamer88", "NeonBoss", "CryptoWolf",
    "PixelQueen", "ByteKing", "StarNova", "DarkPhoenix", "GlowRider",
    "FlashByte", "VoidHunter", "LightCoder", "CyberPunk", "NeonDrift",
    "TurboMax", "QuantumX", "BlazeFire", "StormEdge", "IronWave",
    "NightOwl", "SolarFlare", "ThunderZ", "MysticAce", "RogueOne",
    "AlphaWolf", "BetaRay", "GammaX", "DeltaForce", "OmegaPrime",
  ];

  return Array.from({ length: 99 }, (_, i) => ({
    rank: i + 1,
    name: names[i % names.length] + (i >= names.length ? `${Math.floor(i / names.length) + 1}` : ""),
    invites: Math.max(Math.floor((100 - i * 1.1) + (seed % 10)), 1),
  }));
}

export function getRewardForRank(rank: number): number {
  return WEEKLY_REWARDS[rank] || 0;
}

export function checkAndDistributeRewards(addPoints: (n: number) => void): boolean {
  const data = loadWeeklyData();
  const { start } = getWeekBoundaries();

  // If current week just started and last week wasn't rewarded yet
  if (data.lastRewardedWeek < data.weekStartTimestamp && data.weekStartTimestamp < start) {
    // Distribute rewards (in real app, this would check actual user rank)
    // For now, just mark as rewarded
    data.lastRewardedWeek = data.weekStartTimestamp;
    data.weekStartTimestamp = start;
    data.weekEndTimestamp = start + 7 * 24 * 60 * 60 * 1000;
    saveWeeklyData(data);
    return true;
  }

  // Ensure current week is tracked
  if (data.weekStartTimestamp !== start) {
    data.weekStartTimestamp = start;
    data.weekEndTimestamp = start + 7 * 24 * 60 * 60 * 1000;
    saveWeeklyData(data);
  }

  return false;
}

export function useWeeklyCountdown(): { days: number; hours: number; minutes: number; seconds: number } {
  const [timeLeft, setTimeLeft] = useState(() => {
    const { end } = getWeekBoundaries();
    return Math.max(0, end - Date.now());
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const { end } = getWeekBoundaries();
      setTimeLeft(Math.max(0, end - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalSeconds = Math.floor(timeLeft / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}
