import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Crosshair } from "lucide-react";
import GameLayout from "@/components/GameLayout";
import { useGameStore } from "@/lib/gameStore";
import { playClickSafe, playClickBomb, playLevelWin, playGameOver } from "@/lib/sounds";
import { showRewardAd } from "@/lib/adsgram";

function getLevelConfig(level: number) {
  if (level <= 10) return { targetCount: 1, speed: 100, size: 56 };
  if (level <= 20) return { targetCount: 2, speed: 120, size: 54 };
  if (level <= 40) return { targetCount: 3, speed: 140, size: 50 };
  if (level <= 60) return { targetCount: 4, speed: 160, size: 46 };
  if (level <= 80) return { targetCount: 5, speed: 180, size: 42 };
  if (level <= 90) return { targetCount: 6, speed: 200, size: 38 };
  return { targetCount: 7, speed: 220, size: 34 };
}

function getHitsNeeded(level: number): number {
  return 5 + Math.floor(level / 2);
}

function getPointsForLevel(level: number): number {
  if (level <= 10) return 35;
  if (level <= 20) return 55;
  if (level <= 40) return 75;
  if (level <= 60) return 95;
  if (level <= 80) return 115;
  if (level <= 90) return 150;
  return 175;
}

interface Target {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
}

interface HitEffect {
  id: number;
  x: number;
  y: number;
  type: "hit" | "miss";
}

interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  dist: number;
}

const ARENA_SIZE = 400;
const TIME_LIMIT = 30;

const ReactionTap = () => {
  const { data, startLevel, completeLevel } = useGameStore();
  const progress = data.progress["reaction-tap"];
  const [level, setLevel] = useState(progress?.currentLevel || 0);
  const [gameState, setGameState] = useState<"idle" | "playing" | "won" | "lost">("idle");
  const [targets, setTargets] = useState<Target[]>([]);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [effects, setEffects] = useState<HitEffect[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const animRef = useRef<number>();
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const targetsRef = useRef<Target[]>([]);
  const nextId = useRef(0);
  const hitsRef = useRef(0);
  const config = getLevelConfig(level);
  const hitsNeeded = getHitsNeeded(level);

  const cleanup = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const spawnTarget = useCallback((): Target => {
    const id = nextId.current++;
    const size = getLevelConfig(level).size;
    const margin = size;
    const angle = Math.random() * Math.PI * 2;
    const spd = getLevelConfig(level).speed;
    return {
      id,
      x: margin + Math.random() * (ARENA_SIZE - margin * 2),
      y: margin + Math.random() * (ARENA_SIZE - margin * 2),
      dx: Math.cos(angle) * spd,
      dy: Math.sin(angle) * spd,
    };
  }, [level]);

  const startGame = useCallback(async () => {
    const ok = await startLevel("reaction-tap", level);
    if (!ok) return;
    cleanup();
    setGameState("playing");
    setHits(0);
    hitsRef.current = 0;
    setMisses(0);
    setTimeLeft(TIME_LIMIT);
    setEarnedPoints(0);
    setEffects([]);
    setParticles([]);
    nextId.current = 0;

    const { targetCount } = getLevelConfig(level);
    const initial: Target[] = [];
    for (let i = 0; i < targetCount; i++) {
      const id = nextId.current++;
      const angle = Math.random() * Math.PI * 2;
      const spd = getLevelConfig(level).speed;
      initial.push({
        id,
        x: 50 + Math.random() * (ARENA_SIZE - 100),
        y: 50 + Math.random() * (ARENA_SIZE - 100),
        dx: Math.cos(angle) * spd,
        dy: Math.sin(angle) * spd,
      });
    }
    setTargets(initial);
    targetsRef.current = initial;

    let lastTime = performance.now();
    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const size = getLevelConfig(level).size;
      const half = size / 2;

      const speedMultiplier = 1 + hitsRef.current * 0.08;
      targetsRef.current = targetsRef.current.map((t) => {
        let nx = t.x + t.dx * speedMultiplier * dt;
        let ny = t.y + t.dy * speedMultiplier * dt;
        let ndx = t.dx;
        let ndy = t.dy;
        if (nx < half || nx > ARENA_SIZE - half) { ndx = -ndx; nx = Math.max(half, Math.min(ARENA_SIZE - half, nx)); }
        if (ny < half || ny > ARENA_SIZE - half) { ndy = -ndy; ny = Math.max(half, Math.min(ARENA_SIZE - half, ny)); }
        return { ...t, x: nx, y: ny, dx: ndx, dy: ndy };
      });
      setTargets([...targetsRef.current]);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) return 0;
        return t - 1;
      });
    }, 1000);
  }, [level, cleanup, startLevel]);

  // Win/lose check
  useEffect(() => {
    if (gameState !== "playing") return;
    if (hits >= hitsNeeded) {
      cleanup();
      playLevelWin();
      const base = getPointsForLevel(level);
      const bonus = misses === 0 ? Math.floor(base * 0.5) : 0;
      const pts = base + bonus;
      setEarnedPoints(pts);
      completeLevel("reaction-tap", level, true);
      setGameState("won");
    } else if (timeLeft === 0) {
      cleanup();
      playGameOver();
      setGameState("lost");
      completeLevel("reaction-tap", level, false);
    }
  }, [hits, timeLeft, gameState, hitsNeeded, level, cleanup, completeLevel, misses]);

  const addEffect = (x: number, y: number, type: "hit" | "miss") => {
    const id = Date.now() + Math.random();
    setEffects((p) => [...p, { id, x, y, type }]);
    setTimeout(() => setEffects((p) => p.filter((e) => e.id !== id)), 500);
  };

  const addParticles = (x: number, y: number) => {
    const ps: Particle[] = [];
    for (let i = 0; i < 8; i++) {
      ps.push({ id: Date.now() + i + Math.random(), x, y, angle: (Math.PI * 2 * i) / 8, dist: 30 + Math.random() * 20 });
    }
    setParticles((p) => [...p, ...ps]);
    setTimeout(() => setParticles((p) => p.filter((pp) => !ps.find((np) => np.id === pp.id))), 600);
  };

  const handleTargetTap = (target: Target) => {
    playClickSafe();
    addEffect(target.x, target.y, "hit");
    addParticles(target.x, target.y);
    setHits((h) => h + 1);
    hitsRef.current += 1;

    // Respawn target at new position
    const newTarget = spawnTarget();
    targetsRef.current = targetsRef.current.map((t) =>
      t.id === target.id ? { ...newTarget, id: t.id } : t
    );
    setTargets([...targetsRef.current]);
  };

  const handleArenaMiss = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    playClickBomb();
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = ARENA_SIZE / rect.width;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;
    addEffect(x, y, "miss");
    setMisses((m) => m + 1);
  };

  const nextLevel = () => {
    setLevel((l) => Math.min(l + 1, 100));
    setGameState("idle");
  };

  const retry = async () => { await showRewardAd(); setGameState("idle"); };

  return (
    <GameLayout title="Reaction Tap" level={level} points={data.points} energy={data.energy}>
      <div className="w-full max-w-lg">
        {gameState === "idle" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10">
            <div className="relative mx-auto mb-6 w-20 h-20">
              <div className="absolute inset-0 rounded-full neon-glow animate-pulse" style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.3), transparent)" }} />
              <Crosshair className="w-20 h-20 text-primary relative z-10" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Reaction Tap</h2>
            <p className="text-muted-foreground text-sm mb-1">
              Hit <span className="text-primary font-bold">{hitsNeeded}</span> targets in <span className="text-accent font-bold">{TIME_LIMIT}s</span>
            </p>
            <p className="text-muted-foreground text-xs mb-1">
              Targets: <span className="text-primary font-bold">{config.targetCount}</span> · Speed: <span className="text-accent font-bold">{config.speed}px/s</span>
            </p>
            <p className="text-muted-foreground text-xs mb-6">Tap targets, avoid missing!</p>
            <button onClick={startGame} className="gradient-primary text-primary-foreground font-display text-sm font-bold px-10 py-3 rounded-xl neon-glow hover:scale-105 transition-transform">
              START
            </button>
          </motion.div>
        )}

        {gameState === "playing" && (
          <>
            <div className="flex justify-between items-center mb-3 px-1">
              <span className="text-xs text-muted-foreground">
                Hits: <span className="text-primary font-bold">{hits}/{hitsNeeded}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                Time: <span className={`font-bold ${timeLeft <= 5 ? "text-destructive animate-pulse" : "text-accent"}`}>{timeLeft}s</span>
              </span>
              <span className="text-xs text-muted-foreground">
                Misses: <span className={`font-bold ${misses > 5 ? "text-destructive" : "text-accent"}`}>{misses}</span>
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 rounded-full bg-secondary mb-3 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "var(--gradient-primary)" }}
                animate={{ width: `${Math.min((hits / hitsNeeded) * 100, 100)}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            </div>

            {/* Arena */}
            <div
              className="relative w-full rounded-2xl border border-border/50 overflow-hidden cursor-crosshair"
              style={{
                aspectRatio: "1/1",
                background: "linear-gradient(145deg, hsl(var(--secondary)), hsl(var(--background)))",
              }}
              onClick={handleArenaMiss}
            >
              {/* Grid lines */}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: "linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)",
                backgroundSize: "20% 20%",
              }} />

              {/* Targets */}
              {targets.map((t) => {
                const pctX = (t.x / ARENA_SIZE) * 100;
                const pctY = (t.y / ARENA_SIZE) * 100;
                return (
                  <motion.button
                    key={t.id}
                    className="absolute rounded-full cursor-pointer flex items-center justify-center"
                    style={{
                      width: config.size,
                      height: config.size,
                      left: `${pctX}%`,
                      top: `${pctY}%`,
                      marginLeft: -config.size / 2,
                      marginTop: -config.size / 2,
                      background: "radial-gradient(circle at 35% 35%, hsl(var(--primary)), hsl(var(--primary) / 0.5))",
                      boxShadow: "0 0 20px hsl(var(--primary) / 0.6), inset 0 -3px 6px hsl(var(--primary) / 0.3), inset 0 3px 6px hsl(0 0% 100% / 0.15)",
                      border: "2px solid hsl(var(--primary) / 0.8)",
                    }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); handleTargetTap(t); }}
                  >
                    <Crosshair className="text-primary-foreground" style={{ width: config.size * 0.5, height: config.size * 0.5 }} />
                  </motion.button>
                );
              })}

              {/* Hit/Miss effects */}
              <AnimatePresence>
                {effects.map((e) => (
                  <motion.div
                    key={e.id}
                    initial={{ scale: 0.3, opacity: 1 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute pointer-events-none rounded-full"
                    style={{
                      width: 40,
                      height: 40,
                      left: `${(e.x / ARENA_SIZE) * 100}%`,
                      top: `${(e.y / ARENA_SIZE) * 100}%`,
                      marginLeft: -20,
                      marginTop: -20,
                      border: `3px solid ${e.type === "hit" ? "hsl(var(--primary))" : "hsl(var(--destructive))"}`,
                      boxShadow: e.type === "hit"
                        ? "0 0 20px hsl(var(--primary) / 0.6)"
                        : "0 0 20px hsl(var(--destructive) / 0.6)",
                    }}
                  />
                ))}
              </AnimatePresence>

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
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="absolute w-2 h-2 rounded-full pointer-events-none"
                    style={{
                      left: `${(p.x / ARENA_SIZE) * 100}%`,
                      top: `${(p.y / ARENA_SIZE) * 100}%`,
                      background: "hsl(var(--primary))",
                      boxShadow: "0 0 6px hsl(var(--primary))",
                    }}
                  />
                ))}
              </AnimatePresence>
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
                    <div className="text-5xl mb-3">🎯</div>
                    <h2 className="font-display text-xl font-bold text-primary neon-text mb-2">Level Clear!</h2>
                    <p className="font-display text-3xl font-black text-accent neon-text-accent mb-1">+{earnedPoints} pts</p>
                    <p className="text-muted-foreground text-xs mb-1">{hits} hits · {misses} misses</p>
                    {misses === 0 && <p className="text-primary text-xs font-bold mb-3">🌟 Perfect Accuracy Bonus!</p>}
                    <p className="text-muted-foreground text-xs mb-5">Accuracy: {Math.round((hits / (hits + misses || 1)) * 100)}%</p>
                    <button
                      onClick={nextLevel}
                      className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-display text-sm font-bold px-8 py-3 rounded-xl neon-glow hover:scale-105 transition-transform"
                    >
                      NEXT LEVEL <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-5xl mb-3">💥</div>
                    <h2 className="font-display text-xl font-bold text-destructive mb-2">Time's Up!</h2>
                    <p className="text-muted-foreground text-xs mb-1">{hits}/{hitsNeeded} hits</p>
                    <p className="text-muted-foreground text-xs mb-5">Accuracy: {Math.round((hits / (hits + misses || 1)) * 100)}%</p>
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

export default ReactionTap;
