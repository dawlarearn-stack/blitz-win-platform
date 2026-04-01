import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Coins, Zap, Gift, Play, Clock, Eye, CalendarCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  CHECKIN_REWARDS,
  LEVEL_TASKS,
  AD_TASKS,
  DAILY_FREE_ENERGY,
  REQUIRED_AD_TASKS_FOR_FREE_ENERGY,
  useDailyRewards,
} from "@/lib/dailyRewards";
import type { GameProgress } from "@/lib/gameStore";

interface DailyRewardsProps {
  addPoints: (n: number) => void;
  addEnergy: (n: number) => void;
  progress: Record<string, GameProgress>;
}

function CollapsiblePanel({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl neon-border gradient-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 md:p-5"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-sm md:text-base font-bold text-foreground">{title}</span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 md:px-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ClaimButton({
  canClaim,
  claimed,
  onClick,
  small = false,
}: {
  canClaim: boolean;
  claimed: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  if (claimed) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={`flex items-center gap-1 ${small ? "text-xs" : "text-sm"} text-primary font-display font-bold`}
      >
        <Check className="w-4 h-4" /> Claimed
      </motion.div>
    );
  }
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      disabled={!canClaim}
      onClick={onClick}
      className={`font-display font-bold rounded-lg transition-all ${
        small ? "text-xs px-3 py-1.5" : "text-sm px-4 py-2"
      } ${
        canClaim
          ? "gradient-primary text-primary-foreground neon-glow hover:scale-105"
          : "bg-muted text-muted-foreground cursor-not-allowed"
      }`}
    >
      Claim
    </motion.button>
  );
}

/* ─── Daily Check-in ─── */
function DailyCheckin({
  addPoints,
  addEnergy,
}: {
  addPoints: (n: number) => void;
  addEnergy: (n: number) => void;
}) {
  const { daily, getNextCheckinDay, claimCheckin } = useDailyRewards(addPoints, addEnergy);
  const nextDay = getNextCheckinDay();

  return (
    <CollapsiblePanel title="Daily Check-in" icon={CalendarCheck} defaultOpen>
      <div className="grid grid-cols-7 gap-1.5 md:gap-2">
        {CHECKIN_REWARDS.map((r) => {
          const isClaimed = daily.claimedDays.includes(r.day);
          const isToday = r.day === nextDay;
          const isPast = daily.checkinStreak >= r.day && !isToday;
          return (
            <motion.div
              key={r.day}
              whileHover={{ scale: 1.05 }}
              className={`relative rounded-xl p-1.5 md:p-2 text-center border transition-all ${
                isClaimed || isPast
                  ? "border-primary/40 bg-primary/10"
                  : isToday
                  ? "border-primary neon-border animate-pulse"
                  : "border-border/30 bg-card/50"
              }`}
            >
              <p className="font-display text-[10px] md:text-xs text-muted-foreground mb-0.5">
                D{r.day}
              </p>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] md:text-xs text-primary font-bold flex items-center gap-0.5">
                  <Coins className="w-2.5 h-2.5" />
                  {r.points}
                </span>
                <span className="text-[10px] md:text-xs text-accent font-bold flex items-center gap-0.5">
                  <Zap className="w-2.5 h-2.5" />
                  {r.energy}
                </span>
              </div>
              {isClaimed && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
                >
                  <Check className="w-2.5 h-2.5 text-primary-foreground" />
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
      <div className="mt-4 flex justify-center">
        <ClaimButton
          canClaim={nextDay >= 1}
          claimed={daily.lastCheckinDate === new Date().toISOString().slice(0, 10)}
          onClick={claimCheckin}
        />
      </div>
    </CollapsiblePanel>
  );
}

/* ─── Daily Tasks ─── */
function DailyTasks({
  addPoints,
  addEnergy,
  progress,
}: {
  addPoints: (n: number) => void;
  addEnergy: (n: number) => void;
  progress: Record<string, GameProgress>;
}) {
  const { daily, claimLevelTask } = useDailyRewards(addPoints, addEnergy);

  // Get max level across all games
  const maxLevel = Object.values(progress).reduce(
    (max, p) => Math.max(max, p?.highestLevel || 0),
    0
  );

  return (
    <CollapsiblePanel title="Daily Tasks" icon={Gift}>
      <div className="space-y-3">
        {LEVEL_TASKS.map((task) => {
          const claimed = daily.levelTasksClaimed.includes(task.level);
          const reached = maxLevel >= task.level;
          const pct = Math.min(100, (maxLevel / task.level) * 100);
          return (
            <div
              key={task.level}
              className={`rounded-xl p-3 border transition-all ${
                claimed
                  ? "border-primary/30 bg-primary/5"
                  : reached
                  ? "border-primary/50 neon-border"
                  : "border-border/30 bg-card/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-display text-xs md:text-sm text-foreground font-bold">
                  Reach Level {task.level}
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-primary flex items-center gap-0.5">
                    <Coins className="w-3 h-3" /> {task.points}
                  </span>
                  {task.energy > 0 && (
                    <span className="text-accent flex items-center gap-0.5">
                      <Zap className="w-3 h-3" /> {task.energy}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Progress value={pct} className="h-2 bg-muted" />
                </div>
                <span className="text-[10px] text-muted-foreground font-display min-w-[3rem] text-right">
                  {Math.min(maxLevel, task.level)}/{task.level}
                </span>
                <ClaimButton canClaim={reached && !claimed} claimed={claimed} onClick={() => claimLevelTask(task.level)} small />
              </div>
            </div>
          );
        })}
      </div>
    </CollapsiblePanel>
  );
}

/* ─── Daily Ad Watch ─── */
function DailyAdWatch({
  addPoints,
  addEnergy,
}: {
  addPoints: (n: number) => void;
  addEnergy: (n: number) => void;
}) {
  const { daily, watchAd, claimAdReward, getCooldownRemaining, canClaimFreeEnergy, claimFreeEnergy } = useDailyRewards(addPoints, addEnergy);

  const requiredTasksDone = REQUIRED_AD_TASKS_FOR_FREE_ENERGY.filter((id) => daily.adClaimed.includes(id)).length;
  const requiredTotal = REQUIRED_AD_TASKS_FOR_FREE_ENERGY.length;

  return (
    <CollapsiblePanel title="Daily Ad Watch Bonus" icon={Eye}>
      {/* Free Energy Banner */}
      <div className={`rounded-xl p-3 mb-4 border transition-all ${
        daily.freeEnergyClaimed
          ? "border-primary/30 bg-primary/5"
          : canClaimFreeEnergy()
          ? "border-primary neon-border animate-pulse"
          : "border-accent/30 bg-accent/5"
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-foreground">
                Daily Free Energy
              </p>
              <p className="text-[10px] text-muted-foreground">
                Complete Ad Bonus 1, 2, 3 to unlock
              </p>
            </div>
          </div>
          <span className="text-accent font-display font-bold text-lg flex items-center gap-1">
            <Zap className="w-4 h-4" /> {DAILY_FREE_ENERGY}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Progress value={(requiredTasksDone / requiredTotal) * 100} className="h-2 bg-muted" />
          </div>
          <span className="text-[10px] text-muted-foreground font-display min-w-[2rem] text-right">
            {requiredTasksDone}/{requiredTotal}
          </span>
          <ClaimButton
            canClaim={canClaimFreeEnergy()}
            claimed={daily.freeEnergyClaimed}
            onClick={claimFreeEnergy}
            small
          />
        </div>
      </div>

      <div className="space-y-3">
        {AD_TASKS.map((task) => {
          const progress = daily.adProgress[task.id] || 0;
          const claimed = daily.adClaimed.includes(task.id);
          const completed = progress >= task.required;
          const cooldown = getCooldownRemaining(task.id);
          const pct = (progress / task.required) * 100;
          const isRequired = REQUIRED_AD_TASKS_FOR_FREE_ENERGY.includes(task.id);

          return (
            <div
              key={task.id}
              className={`rounded-xl p-3 border transition-all ${
                claimed
                  ? "border-primary/30 bg-primary/5"
                  : completed
                  ? "border-primary/50 neon-border"
                  : "border-border/30 bg-card/30"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-xs md:text-sm text-foreground font-bold">
                    {task.label}
                  </span>
                  {isRequired && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent font-display font-bold">
                      ⚡ Required
                    </span>
                  )}
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-display">
                  {task.provider}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2 text-xs">
                {task.rewardPoints > 0 && (
                  <span className="text-primary flex items-center gap-0.5">
                    <Coins className="w-3 h-3" /> {task.rewardPoints} pts
                  </span>
                )}
                {task.rewardEnergy > 0 && (
                  <span className="text-accent flex items-center gap-0.5">
                    <Zap className="w-3 h-3" /> {task.rewardEnergy} Energy
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Progress value={pct} className="h-2 bg-muted" />
                </div>
                <span className="text-[10px] text-muted-foreground font-display min-w-[2rem] text-right">
                  {progress}/{task.required}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                {!completed && !claimed && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    disabled={cooldown > 0}
                    onClick={() => watchAd(task.id)}
                    className={`font-display font-bold text-xs rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-all ${
                      cooldown > 0
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30"
                    }`}
                  >
                    {cooldown > 0 ? (
                      <>
                        <Clock className="w-3 h-3" /> {cooldown}s
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" /> Watch Ad
                      </>
                    )}
                  </motion.button>
                )}
                {(completed || claimed) && (
                  <div /> // spacer
                )}
                <ClaimButton
                  canClaim={completed && !claimed}
                  claimed={claimed}
                  onClick={() => claimAdReward(task.id)}
                  small
                />
              </div>
            </div>
          );
        })}
      </div>
    </CollapsiblePanel>
  );
}

/* ─── Main Component ─── */
export default function DailyRewards({ addPoints, addEnergy, progress }: DailyRewardsProps) {
  return (
    <section className="py-12 px-4">
      <div className="container max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="font-display text-2xl md:text-3xl font-black text-foreground mb-2">
            DAILY <span className="text-primary neon-text">REWARDS</span>
          </h2>
          <p className="text-muted-foreground text-sm">Complete daily tasks to earn bonus rewards</p>
        </motion.div>
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0 }}>
            <DailyCheckin addPoints={addPoints} addEnergy={addEnergy} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
            <DailyTasks addPoints={addPoints} addEnergy={addEnergy} progress={progress} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
            <DailyAdWatch addPoints={addPoints} addEnergy={addEnergy} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
