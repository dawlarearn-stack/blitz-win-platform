import { useState, useCallback, useEffect, useRef } from "react";
import { showRewardAd } from "@/lib/adsgram";
import { showMonetangRewardAd } from "@/lib/monetag";
import { getTelegramId } from "@/lib/fingerprint";
import { apiPost } from "@/lib/api";

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
  cooldown: number;
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
  lastCheckinDate: string;
  checkinStreak: number;
  claimedDays: number[];
  levelTasksClaimed: number[];
  adProgress: Record<string, number>;
  adClaimed: string[];
  adLastWatch: Record<string, number>;
  resetDate: string;
  freeEnergyClaimed: boolean;
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

// Save to backend (fire-and-forget with error handling)
function saveToBackend(data: DailyData) {
  const telegramId = getTelegramId();
  apiPost("save-daily-rewards", { telegram_id: telegramId, daily: data }).catch(() => {});
}

export function useDailyRewards(addPoints: (n: number) => void, addEnergy: (n: number) => void) {
  const [daily, setDaily] = useState<DailyData>(getDefaults);
  const [loaded, setLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced save - waits 500ms after last change before saving
  const debouncedSave = useCallback((data: DailyData) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveToBackend(data), 500);
  }, []);

  // Load from backend on mount
  useEffect(() => {
    const telegramId = getTelegramId();
    apiPost<DailyData>("get-daily-rewards", { telegram_id: telegramId })
      .then((data) => {
        if (data) {
          setDaily({
            lastCheckinDate: data.lastCheckinDate || "",
            checkinStreak: data.checkinStreak || 0,
            claimedDays: data.claimedDays || [],
            levelTasksClaimed: data.levelTasksClaimed || [],
            adProgress: data.adProgress || {},
            adClaimed: data.adClaimed || [],
            adLastWatch: data.adLastWatch || {},
            resetDate: data.resetDate || today(),
            freeEnergyClaimed: data.freeEnergyClaimed || false,
          });
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Ticker for cooldown display
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const getNextCheckinDay = useCallback((): number => {
    if (daily.lastCheckinDate === today()) return -1;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    if (daily.lastCheckinDate === yStr) {
      return (daily.checkinStreak % 7) + 1;
    }
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
      debouncedSave(next);
      return next;
    });
  }, [getNextCheckinDay, addPoints, addEnergy, debouncedSave]);

  const claimLevelTask = useCallback(async (level: number) => {
    const task = LEVEL_TASKS.find((t) => t.level === level);
    if (!task || daily.levelTasksClaimed.includes(level)) return;
    const adWatched = await showRewardAd();
    if (!adWatched) return;
    addPoints(task.points);
    if (task.energy > 0) addEnergy(task.energy);
    setDaily((prev) => {
      const next = { ...prev, levelTasksClaimed: [...prev.levelTasksClaimed, level] };
      debouncedSave(next);
      return next;
    });
  }, [daily, addPoints, addEnergy, debouncedSave]);

  const watchAd = useCallback(async (taskId: string) => {
    const task = AD_TASKS.find((t) => t.id === taskId);
    if (!task) return;
    const current = daily.adProgress[taskId] || 0;
    if (current >= task.required) return;
    if (task.cooldown > 0) {
      const last = daily.adLastWatch[taskId] || 0;
      if (Date.now() - last < task.cooldown * 1000) return;
    }
    const adWatched = task.provider === "Monetag"
      ? await showMonetangRewardAd()
      : await showRewardAd();
    if (!adWatched) return;
    setDaily((prev) => {
      const next = {
        ...prev,
        adProgress: { ...prev.adProgress, [taskId]: (prev.adProgress[taskId] || 0) + 1 },
        adLastWatch: { ...prev.adLastWatch, [taskId]: Date.now() },
      };
      debouncedSave(next);
      return next;
    });
  }, [daily, debouncedSave]);

  const claimAdReward = useCallback(async (taskId: string) => {
    const task = AD_TASKS.find((t) => t.id === taskId);
    if (!task || daily.adClaimed.includes(taskId)) return;
    const progress = daily.adProgress[taskId] || 0;
    if (progress < task.required) return;
    if (task.rewardPoints > 0) addPoints(task.rewardPoints);
    if (task.rewardEnergy > 0) addEnergy(task.rewardEnergy);
    setDaily((prev) => {
      const next = { ...prev, adClaimed: [...prev.adClaimed, taskId] };
      debouncedSave(next);
      return next;
    });
  }, [daily, addPoints, addEnergy, debouncedSave]);

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
      debouncedSave(next);
      return next;
    });
  }, [canClaimFreeEnergy, addEnergy, debouncedSave]);

  return {
    daily,
    loaded,
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
