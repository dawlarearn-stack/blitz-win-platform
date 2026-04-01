import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Gift } from "lucide-react";
import GameLayout from "@/components/GameLayout";
import { useGameStore } from "@/lib/gameStore";
import { playClickSafe, playClickBomb, playLevelWin, playGameOver } from "@/lib/sounds";

const TOTAL_BOXES = 15;
const PICKS_PER_LEVEL = 3;

function getLevelConfig(level: number) {
  let traps: number, bonus: number;
  if (level <= 9) { traps = 2; bonus = 4; }
  else if (level <= 19) { traps = 3; bonus = 3; }
  else if (level <= 49) { traps = 3; bonus = 3; }
  else if (level <= 79) { traps = 4; bonus = 2; }
  else { traps = 5; bonus = 1; }
  const reward = TOTAL_BOXES - traps - bonus;
  return { traps, bonus, reward };
}

function getRewardPoints(level: number): number {
  if (level <= 9) return 35;
  if (level <= 19) return 55;
  if (level <= 39) return 75;
  if (level <= 59) return 95;
  if (level <= 79) return 115;
  if (level <= 89) return 150;
  return 175;
}

function getBonusPoints(level: number): number {
  if (level <= 9) return 70;
  if (level <= 19) return 110;
  if (level <= 39) return 130;
  if (level <= 59) return 145;
  if (level <= 79) return 165;
  if (level <= 89) return 185;
  return 220;
}

type BoxContent = "reward" | "bonus" | "trap";
type BoxState = { content: BoxContent; revealed: boolean };

function generateBoxes(level: number): BoxState[] {
  const { traps, bonus, reward } = getLevelConfig(level);
  const contents: BoxContent[] = [];
  for (let i = 0; i < reward; i++) contents.push("reward");
  for (let i = 0; i < bonus; i++) contents.push("bonus");
  for (let i = 0; i < traps; i++) contents.push("trap");
  // Shuffle
  for (let i = contents.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [contents[i], contents[j]] = [contents[j], contents[i]];
  }
  return contents.map((c) => ({ content: c, revealed: false }));
}

const BOX_EMOJIS: Record<BoxContent, string> = { reward: "💎", bonus: "🌟", trap: "💣" };

interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  dist: number;
  color: string;
}

const LuckyBox = () => {
  const { data, startLevel, completeLevel } = useGameStore();
  const progress = data.progress["lucky-box"];
  const [level, setLevel] = useState(progress?.currentLevel || 0);
  const [boxes, setBoxes] = useState<BoxState[]>(() => generateBoxes(level));
  const [picksLeft, setPicksLeft] = useState(PICKS_PER_LEVEL);
  const [gameState, setGameState] = useState<"idle" | "playing" | "won" | "lost">("idle");
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [totalRoundPoints, setTotalRoundPoints] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [lastRevealedIdx, setLastRevealedIdx] = useState<number | null>(null);

  const config = useMemo(() => getLevelConfig(level), [level]);

  const spawnParticles = (boxIdx: number, color: string) => {
    const col = boxIdx % 5;
    const row = Math.floor(boxIdx / 5);
    const x = (col + 0.5) * (100 / 5);
    const y = (row + 0.5) * (100 / 3);
    const ps: Particle[] = [];
    for (let i = 0; i < 10; i++) {
      ps.push({
        id: Date.now() + i + Math.random(),
        x, y,
        angle: (Math.PI * 2 * i) / 10,
        dist: 30 + Math.random() * 25,
        color,
      });
    }
    setParticles((p) => [...p, ...ps]);
    setTimeout(() => setParticles((p) => p.filter((pp) => !ps.find((np) => np.id === pp.id))), 700);
  };

  const startGame = useCallback(async () => {
    const ok = await startLevel("lucky-box", level);
    if (!ok) return;
    setBoxes(generateBoxes(level));
    setPicksLeft(PICKS_PER_LEVEL);
    setGameState("playing");
    setEarnedPoints(0);
    setTotalRoundPoints(0);
    setParticles([]);
    setLastRevealedIdx(null);
  }, [level, startLevel]);

  const handleOpen = useCallback((index: number) => {
    if (gameState !== "playing" || boxes[index].revealed || picksLeft <= 0) return;

    const updated = boxes.map((b, i) => i === index ? { ...b, revealed: true } : b);
    setBoxes(updated);
    setLastRevealedIdx(index);

    const content = boxes[index].content;

    if (content === "trap") {
      playClickBomb();
      spawnParticles(index, "hsl(0 80% 50%)");
      setTimeout(() => {
        playGameOver();
        setBoxes((prev) => prev.map((b) => ({ ...b, revealed: true })));
        setGameState("lost");
        completeLevel("lucky-box", level, false);
      }, 600);
    } else if (content === "reward") {
      playClickSafe();
      const pts = getRewardPoints(level);
      setTotalRoundPoints((p) => p + pts);
      spawnParticles(index, "hsl(160 80% 50%)");
      const newPicksLeft = picksLeft - 1;
      setPicksLeft(newPicksLeft);
      if (newPicksLeft <= 0) {
        setTimeout(() => {
          playLevelWin();
          const finalPts = totalRoundPoints + pts;
          setEarnedPoints(finalPts);
          completeLevel("lucky-box", level, true);
          setBoxes((prev) => prev.map((b) => ({ ...b, revealed: true })));
          setGameState("won");
        }, 500);
      }
    } else if (content === "bonus") {
      playClickSafe();
      const pts = getBonusPoints(level);
      setTotalRoundPoints((p) => p + pts);
      spawnParticles(index, "hsl(45 90% 55%)");
      const newPicksLeft = picksLeft - 1;
      setPicksLeft(newPicksLeft);
      if (newPicksLeft <= 0) {
        setTimeout(() => {
          playLevelWin();
          const finalPts = totalRoundPoints + pts;
          setEarnedPoints(finalPts);
          completeLevel("lucky-box", level, true);
          setBoxes((prev) => prev.map((b) => ({ ...b, revealed: true })));
          setGameState("won");
        }, 500);
      }
    }
  }, [boxes, gameState, picksLeft, level, totalRoundPoints, completeLevel]);

  const nextLevel = () => { setLevel((l) => Math.min(l + 1, 100)); setGameState("idle"); };
  const retry = async () => { await showRewardAd(); setGameState("idle"); };

  const getBoxStyle = (box: BoxState, idx: number) => {
    if (!box.revealed) {
      return {
        background: "linear-gradient(145deg, hsl(var(--secondary)), hsl(var(--background)))",
        border: "2px solid hsl(var(--border) / 0.5)",
        boxShadow: "0 4px 12px hsl(0 0% 0% / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.05)",
      };
    }
    if (box.content === "trap") {
      return {
        background: "linear-gradient(145deg, hsl(var(--destructive) / 0.3), hsl(var(--destructive) / 0.1))",
        border: "2px solid hsl(var(--destructive) / 0.6)",
        boxShadow: "0 0 20px hsl(var(--destructive) / 0.4), inset 0 0 10px hsl(var(--destructive) / 0.1)",
      };
    }
    if (box.content === "bonus") {
      return {
        background: "linear-gradient(145deg, hsl(45 80% 20%), hsl(45 60% 12%))",
        border: "2px solid hsl(45 80% 50% / 0.6)",
        boxShadow: "0 0 20px hsl(45 80% 50% / 0.4), inset 0 0 10px hsl(45 80% 50% / 0.1)",
      };
    }
    return {
      background: "linear-gradient(145deg, hsl(160 80% 20%), hsl(160 60% 12%))",
      border: "2px solid hsl(160 80% 40% / 0.6)",
      boxShadow: "0 0 20px hsl(160 80% 50% / 0.3), inset 0 0 10px hsl(160 80% 50% / 0.1)",
    };
  };

  return (
    <GameLayout title="Lucky Box" level={level} points={data.points} energy={data.energy}>
      <div className="w-full max-w-md">
        {gameState === "idle" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10">
            <div className="relative mx-auto mb-6 w-20 h-20">
              <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.3), transparent)" }} />
              <Gift className="w-20 h-20 text-primary relative z-10" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Lucky Box</h2>
            <p className="text-muted-foreground text-sm mb-1">
              Pick <span className="text-primary font-bold">{PICKS_PER_LEVEL}</span> boxes from <span className="text-accent font-bold">{TOTAL_BOXES}</span>
            </p>
            <p className="text-muted-foreground text-xs mb-1">
              💎 Reward: <span className="text-primary font-bold">{config.reward}</span> · 🌟 Bonus: <span className="text-accent font-bold">{config.bonus}</span> · 💣 Trap: <span className="text-destructive font-bold">{config.traps}</span>
            </p>
            <p className="text-muted-foreground text-xs mb-6">Avoid traps to earn points!</p>
            <button onClick={startGame} className="gradient-primary text-primary-foreground font-display text-sm font-bold px-10 py-3 rounded-xl neon-glow hover:scale-105 transition-transform">
              START
            </button>
          </motion.div>
        )}

        {gameState === "playing" && (
          <>
            <div className="flex justify-between items-center mb-3 px-1">
              <span className="text-xs text-muted-foreground">
                Picks Left: <span className="text-primary font-bold">{picksLeft}/{PICKS_PER_LEVEL}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                Points: <span className="text-accent font-bold">{totalRoundPoints}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                Traps: <span className="text-destructive font-bold">{config.traps}</span>
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 rounded-full bg-secondary mb-4 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "var(--gradient-primary, hsl(var(--primary)))" }}
                animate={{ width: `${((PICKS_PER_LEVEL - picksLeft) / PICKS_PER_LEVEL) * 100}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            </div>

            {/* Box Grid - 5 columns, 3 rows */}
            <div className="relative">
              <div className="grid grid-cols-5 gap-2.5">
                {boxes.map((box, i) => (
                  <motion.button
                    key={i}
                    whileTap={!box.revealed ? { scale: 0.88 } : {}}
                    whileHover={!box.revealed ? { scale: 1.08, y: -2 } : {}}
                    onClick={() => handleOpen(i)}
                    disabled={box.revealed || gameState !== "playing"}
                    className="aspect-square rounded-xl cursor-pointer flex items-center justify-center relative overflow-hidden"
                    style={{
                      ...getBoxStyle(box, i),
                      perspective: "600px",
                      transformStyle: "preserve-3d",
                    }}
                    initial={false}
                    animate={
                      box.revealed && lastRevealedIdx === i
                        ? { rotateY: [0, 180, 360], scale: [1, 1.1, 1] }
                        : {}
                    }
                    transition={{ duration: 0.5 }}
                  >
                    {/* Shine effect on unrevealed */}
                    {!box.revealed && (
                      <div
                        className="absolute inset-0 opacity-20 pointer-events-none"
                        style={{
                          background: "linear-gradient(135deg, transparent 30%, hsl(var(--primary) / 0.15) 50%, transparent 70%)",
                        }}
                      />
                    )}

                    <AnimatePresence mode="wait">
                      {box.revealed ? (
                        <motion.span
                          key="content"
                          initial={{ scale: 0, rotateY: 90 }}
                          animate={{ scale: 1, rotateY: 0 }}
                          transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
                          className="text-2xl sm:text-3xl"
                        >
                          {BOX_EMOJIS[box.content]}
                        </motion.span>
                      ) : (
                        <motion.span key="hidden">
                          <Gift className="w-6 h-6 sm:w-7 sm:h-7 text-primary/40" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                ))}
              </div>

              {/* Particles */}
              <AnimatePresence>
                {particles.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: Math.cos(p.angle) * p.dist,
                      y: Math.sin(p.angle) * p.dist,
                      opacity: 0,
                      scale: 0,
                    }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="absolute w-2 h-2 rounded-full pointer-events-none"
                    style={{
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      background: p.color,
                      boxShadow: `0 0 8px ${p.color}`,
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground">
              <span>💎 +{getRewardPoints(level)} pts</span>
              <span>🌟 +{getBonusPoints(level)} pts</span>
              <span>💣 Game Over</span>
            </div>
          </>
        )}

        {/* Win/Lose overlay */}
        <AnimatePresence>
          {(gameState === "won" || gameState === "lost") && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="gradient-card rounded-2xl border border-border/50 p-8 text-center max-w-xs mx-4"
                style={{
                  boxShadow: gameState === "won"
                    ? "0 0 60px hsl(var(--primary) / 0.3)"
                    : "0 0 60px hsl(var(--destructive) / 0.3)",
                }}
              >
                {gameState === "won" ? (
                  <>
                    <div className="text-5xl mb-3">🎁</div>
                    <h2 className="font-display text-xl font-bold text-primary neon-text mb-2">Lucky!</h2>
                    <p className="font-display text-3xl font-black text-accent neon-text-accent mb-1">+{earnedPoints} pts</p>
                    <p className="text-muted-foreground text-xs mb-5">All {PICKS_PER_LEVEL} picks successful!</p>
                    <button
                      onClick={nextLevel}
                      className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-display text-sm font-bold px-8 py-3 rounded-xl neon-glow hover:scale-105 transition-transform"
                    >
                      NEXT LEVEL <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-5xl mb-3">💣</div>
                    <h2 className="font-display text-xl font-bold text-destructive mb-2">Boom!</h2>
                    <p className="text-muted-foreground text-xs mb-5">You hit a trap!</p>
                    <button
                      onClick={retry}
                      className="inline-flex items-center gap-2 bg-secondary text-foreground font-display text-sm font-bold px-8 py-3 rounded-xl hover:bg-secondary/80 transition-colors"
                    >
                      RETRY
                    </button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GameLayout>
  );
};

export default LuckyBox;
