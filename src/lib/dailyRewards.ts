import { useState, useCallback, useEffect } from "react";
import { showRewardAd } from "@/lib/adsgram";
import { showMonetangRewardAd } from "@/lib/monetag";
const DAILY_KEY = "pgr_daily_rewards";

export interface CheckinDay {
  day: number;
  points: number;
  energy: number;
}

export const CHECKIN_REWARDS: CheckinDay[] = [
  { day: 1, points: 100, energy: 10 },
  { day: 2, points: 150, energy: 15 },
  { day: 3, points: 200, energy: 20 },
  { day: 4, points: 300, energy: 30 },
  { day: 5, points: 500, energy: 50 },
  { day: 6, points: 700, energy: 70 },
  { day: 7, points: 950, energy: 95 },
];

export interface LevelTask {
  level: number;
  points: number;
  energy: number;
}

export const LEVEL_TASKS: LevelTask[] = [
  { level: 20, points: 30, energy: 0 },
  { level: 50, points: 80, energy: 5 },
  { level: 75, points: 150, energy: 15 },
  { level: 100, points: 250, energy: 30 },
];

export interface AdTask {
  id: string;
  label: string;
  required: number;
  rewardPoints: number;
  rewardEnergy: number;
  provider: string;
  cooldown: number; // seconds, 0 = no cooldown
}

export const AD_TASKS: AdTask[] = [
  { id: "ad1", label: "Daily Ad Watch Bonus 1", required: 1, rewardPoints: 100, rewardEnergy: 0, provider: "AdsGram", cooldown: 0 },
  { id: "ad2", label: "Daily Ad Watch Bonus 2", required: 1, rewardPoints: 100, rewardEnergy: 0, provider: "Monetag", cooldown: 0 },
  { id: "ad3", label: "Daily Ad Watch Bonus 3", required: 5, rewardPoints: 0, rewardEnergy: 5, provider: "AdsGram", cooldown: 60 },
  { id: "ad4", label: "Daily Ad Watch Bonus 4", required: 5, rewardPoints: 0, rewardEnergy: 5, provider: "Monetag", cooldown: 60 },
  { id: "ad5", label: "Daily Ad Watch Bonus 5", required: 5, rewardPoints: 0, rewardEnergy: 5, provider: "AdsGram", cooldown: 60 },
];

export const DAILY_FREE_ENERGY = 1000;
export const REQUIRED_AD_TASKS_FOR_FREE_ENERGY = ["ad1", "ad2", "ad3", "ad4"];

export interface DailyData {
  lastCheckinDate: string; // YYYY-MM-DD
  checkinStreak: number; // 0-6 index of last claimed day
  claimedDays: number[]; // day numbers claimed today cycle
  levelTasksClaimed: number[]; // levels claimed today
  adProgress: Record<string, number>; // ad task id -> watches done
  adClaimed: string[]; // ad task ids claimed
  adLastWatch: Record<string, number>; // ad task id -> timestamp of last watch
  resetDate: string; // YYYY-MM-DD when data was last reset
  freeEnergyClaimed: boolean; // whether daily free energy was claimed
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDefaults(): DailyData {
  return {
    lastCheckinDate: "",
    checkinStreak: 0,
    claimedDays: [],
    levelTasksClaimed: [],
    adProgress: {},
    adClaimed: [],
    adLastWatch: {},
    resetDate: today(),
    freeEnergyClaimed: false,
  };
}

function load(): DailyData {
  const defaults = getDefaults();
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const data = { ...defaults, ...parsed };
      // Reset daily tasks if new day
      if (data.resetDate !== today()) {
        data.levelTasksClaimed = [];
        data.adProgress = {};
        data.adClaimed = [];
        data.adLastWatch = {};
        data.freeEnergyClaimed = false;
        data.resetDate = today();
      }
      return data;
    }
  } catch {}
  return defaults;
}

function save(data: DailyData) {
  localStorage.setItem(DAILY_KEY, JSON.stringify(data));
}

export function useDailyRewards(addPoints: (n: number) => void, addEnergy: (n: number) => void) {
  const [daily, setDaily] = useState<DailyData>(load);

  // Ticker for cooldown display
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const getNextCheckinDay = useCallback((): number => {
    if (daily.lastCheckinDate === today()) return -1; // already claimed today
    // If last checkin was yesterday, continue streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    if (daily.lastCheckinDate === yStr) {
      return (daily.checkinStreak % 7) + 1;
    }
    // Streak broken or first time
    return 1;
  }, [daily]);

  const claimCheckin = useCallback(async () => {
    const nextDay = getNextCheckinDay();
    if (nextDay < 1) return;
    const adWatched = await showRewardAd();
    if (!adWatched) return;
    const reward = CHECKIN_REWARDS[nextDay - 1];
    addPoints(reward.points);
    addEnergy(reward.energy);
    setDaily((prev) => {
      const next: DailyData = {
        ...prev,
        lastCheckinDate: today(),
        checkinStreak: nextDay,
        claimedDays: [...prev.claimedDays, nextDay],
      };
      save(next);
      return next;
    });
  }, [getNextCheckinDay, addPoints, addEnergy]);

  const claimLevelTask = useCallback(async (level: number) => {
    const task = LEVEL_TASKS.find((t) => t.level === level);
    if (!task || daily.levelTasksClaimed.includes(level)) return;
    const adWatched = await showRewardAd();
    if (!adWatched) return;
    addPoints(task.points);
    if (task.energy > 0) addEnergy(task.energy);
    setDaily((prev) => {
      const next = { ...prev, levelTasksClaimed: [...prev.levelTasksClaimed, level] };
      save(next);
      return next;
    });
  }, [daily, addPoints, addEnergy]);

  const watchAd = useCallback(async (taskId: string) => {
    const task = AD_TASKS.find((t) => t.id === taskId);
    if (!task) return;
    const current = daily.adProgress[taskId] || 0;
    if (current >= task.required) return;
    // Check cooldown
    if (task.cooldown > 0) {
      const last = daily.adLastWatch[taskId] || 0;
      if (Date.now() - last < task.cooldown * 1000) return;
    }
    // Show rewarded ad from the appropriate provider
    const adWatched = task.provider === "Monetag"
      ? await showMonetangRewardAd()
      : await showRewardAd();
    if (!adWatched) return; // ad skipped or failed — don't count
    setDaily((prev) => {
      const next = {
        ...prev,
        adProgress: { ...prev.adProgress, [taskId]: (prev.adProgress[taskId] || 0) + 1 },
        adLastWatch: { ...prev.adLastWatch, [taskId]: Date.now() },
      };
      save(next);
      return next;
    });
  }, [daily]);

  const claimAdReward = useCallback(async (taskId: string) => {
    const task = AD_TASKS.find((t) => t.id === taskId);
    if (!task || daily.adClaimed.includes(taskId)) return;
    const progress = daily.adProgress[taskId] || 0;
    if (progress < task.required) return;
    if (task.rewardPoints > 0) addPoints(task.rewardPoints);
    if (task.rewardEnergy > 0) addEnergy(task.rewardEnergy);
    setDaily((prev) => {
      const next = { ...prev, adClaimed: [...prev.adClaimed, taskId] };
      save(next);
      return next;
    });
  }, [daily, addPoints, addEnergy]);

  const getCooldownRemaining = useCallback((taskId: string): number => {
    const task = AD_TASKS.find((t) => t.id === taskId);
    if (!task || task.cooldown === 0) return 0;
    const last = daily.adLastWatch[taskId] || 0;
    const remaining = Math.max(0, task.cooldown - Math.floor((Date.now() - last) / 1000));
    return remaining;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daily, tick]);

  const canClaimFreeEnergy = useCallback((): boolean => {
    if (daily.freeEnergyClaimed) return false;
    return REQUIRED_AD_TASKS_FOR_FREE_ENERGY.every((id) => daily.adClaimed.includes(id));
  }, [daily]);

  const claimFreeEnergy = useCallback(() => {
    if (!canClaimFreeEnergy()) return;
    addEnergy(DAILY_FREE_ENERGY);
    setDaily((prev) => {
      const next = { ...prev, freeEnergyClaimed: true };
      save(next);
      return next;
    });
  }, [canClaimFreeEnergy, addEnergy]);

  return {
    daily,
    getNextCheckinDay,
    claimCheckin,
    claimLevelTask,
    watchAd,
    claimAdReward,
    getCooldownRemaining,
    canClaimFreeEnergy,
    claimFreeEnergy,
  };
}
