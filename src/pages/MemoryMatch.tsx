import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, ArrowRight, Sparkles } from "lucide-react";
import GameLayout from "@/components/GameLayout";
import { useGameStore } from "@/lib/gameStore";
import { playClickSafe, playClickBomb, playLevelWin, playGameOver } from "@/lib/sounds";
import { showRewardAd } from "@/lib/adsgram";

const EMOJIS = [
  "🎮", "🎲", "🎯", "🏆", "💎", "⚡", "🔥", "🎪",
  "🌟", "🎵", "🎨", "🚀", "🎁", "🃏", "🧩", "🎰",
  "🦄", "🐉", "👾", "🤖", "🛸", "🌈", "🍀", "🔮",
  "🧲",
];

function getPairCount(level: number): number {
  if (level <= 0) return 4;
  if (level <= 4) return 4 + level;                    // 4→8
  if (level <= 9) return 6 + Math.floor((level - 4) * 0.8); // ~6→10
  if (level <= 19) return 8 + Math.floor((level - 9) * 0.2); // ~8→10
  if (level <= 49) return 10 + Math.floor((level - 19) * 0.17); // ~10→15
  return Math.min(15 + Math.floor((level - 49) * 0.2), 25); // ~15→25
}

function getMaxMoves(_level: number, pairs: number): number {
  return pairs * 3;
}

function getPointsForLevel(level: number): number {
  if (level <= 9) return 35;
  if (level <= 19) return 55;
  if (level <= 39) return 75;
  if (level <= 59) return 95;
  if (level <= 79) return 115;
  if (level <= 89) return 150;
  return 175;
}

function generateCards(level: number) {
  const pairCount = getPairCount(level);
  const selected = EMOJIS.slice(0, pairCount);
  const cards = [...selected, ...selected].map((emoji, i) => ({
    id: i,
    emoji,
    flipped: false,
    matched: false,
  }));
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

type Card = { id: number; emoji: string; flipped: boolean; matched: boolean };

const MemoryMatch = () => {
  const { data, startLevel, completeLevel } = useGameStore();
  const progress = data.progress["memory-match"];
  const [level, setLevel] = useState(progress?.currentLevel || 0);
  const [cards, setCards] = useState<Card[]>(() => generateCards(level));
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [gameState, setGameState] = useState<"idle" | "playing" | "won" | "lost">("idle");
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [matchFlash, setMatchFlash] = useState<number[]>([]);
  const [failFlash, setFailFlash] = useState<number[]>([]);
  const [sparkleIds, setSparkleIds] = useState<number[]>([]);

  const pairCount = useMemo(() => getPairCount(level), [level]);
  const maxMoves = useMemo(() => getMaxMoves(level, pairCount), [level, pairCount]);

  const handleFlip = useCallback(
    (card: Card) => {
      if (gameState !== "playing" || card.flipped || card.matched || selected.length >= 2) return;

      const nextCards = cards.map((c) => (c.id === card.id ? { ...c, flipped: true } : c));
      setCards(nextCards);
      const nextSelected = [...selected, card.id];
      setSelected(nextSelected);

      if (nextSelected.length === 2) {
        const newMoves = moves + 1;
        setMoves(newMoves);
        const [a, b] = nextSelected.map((id) => nextCards.find((c) => c.id === id)!);

        if (a.emoji === b.emoji) {
          playClickSafe();
          setMatchFlash([a.id, b.id]);
          setSparkleIds([a.id, b.id]);
          setTimeout(() => setMatchFlash([]), 600);
          setTimeout(() => setSparkleIds([]), 1000);

          setTimeout(() => {
            setCards((prev) => {
              const updated = prev.map((c) =>
                c.id === a.id || c.id === b.id ? { ...c, matched: true } : c
              );
              if (updated.every((c) => c.matched)) {
                playLevelWin();
                const basePts = getPointsForLevel(level);
                const movesLeft = maxMoves - newMoves;
                const bonus = Math.max(0, Math.floor(movesLeft * 0.5));
                const pts = basePts + bonus;
                setEarnedPoints(pts);
                completeLevel("memory-match", level, true);
                setGameState("won");
              }
              return updated;
            });
            setSelected([]);
          }, 500);
        } else {
          playClickBomb();
          setFailFlash([a.id, b.id]);
          setTimeout(() => setFailFlash([]), 500);

          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === a.id || c.id === b.id ? { ...c, flipped: false } : c
              )
            );
            setSelected([]);

            if (newMoves >= maxMoves) {
              playGameOver();
              setGameState("lost");
              completeLevel("memory-match", level, false);
            }
          }, 800);
        }
      }
    },
    [cards, selected, gameState, moves, level, maxMoves, completeLevel]
  );

  const startGame = useCallback(async () => {
    const ok = await startLevel("memory-match", level);
    if (!ok) return;
    setCards(generateCards(level));
    setMoves(0);
    setSelected([]);
    setMatchFlash([]);
    setFailFlash([]);
    setSparkleIds([]);
    setEarnedPoints(0);
    setGameState("playing");
  }, [level, startLevel]);

  const nextLevel = () => { setLevel((l) => Math.min(l + 1, 100)); setGameState("idle"); };
  const retry = async () => { await showRewardAd(); setGameState("idle"); };

  // Grid columns based on card count
  const totalCards = pairCount * 2;
  const cols = totalCards <= 8 ? 4 : totalCards <= 16 ? 4 : totalCards <= 20 ? 5 : totalCards <= 30 ? 6 : totalCards <= 40 ? 8 : 10;

  return (
    <GameLayout title="Memory Match" level={level} points={data.points} energy={data.energy}>
      <div className="w-full max-w-lg">
        {gameState === "idle" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10">
            <div className="text-6xl mb-4">🃏</div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Memory Match</h2>
            <p className="text-muted-foreground text-sm mb-1">Match <span className="text-primary font-bold">{pairCount}</span> pairs in <span className="text-accent font-bold">{maxMoves}</span> moves</p>
            <p className="text-muted-foreground text-xs mb-6">Find all matching emoji pairs!</p>
            <button onClick={startGame} className="gradient-primary text-primary-foreground font-display text-sm font-bold px-10 py-3 rounded-xl neon-glow hover:scale-105 transition-transform">START</button>
          </motion.div>
        )}

        {gameState !== "idle" && (<>
        {/* Stats */}
        <div className="flex justify-between items-center mb-4 px-1">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Pairs: <span className="text-primary font-bold">{pairCount}</span></span>
            <span className="text-xs text-muted-foreground">Moves: <span className={`font-bold ${moves > maxMoves * 0.75 ? "text-destructive" : "text-accent"}`}>{moves}/{maxMoves}</span></span>
          </div>
          <span className="text-xs text-muted-foreground">+{getPointsForLevel(level)} pts</span>
        </div>

        {/* Card Grid */}
        <div
          className="grid gap-1.5 sm:gap-2 mb-5"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {cards.map((card) => {
            const isMatchFlash = matchFlash.includes(card.id);
            const isFailFlash = failFlash.includes(card.id);
            const hasSparkle = sparkleIds.includes(card.id);

            return (
              <motion.button
                key={card.id}
                whileTap={!card.flipped && !card.matched ? { scale: 0.9 } : {}}
                onClick={() => handleFlip(card)}
                className="relative aspect-square rounded-xl cursor-pointer overflow-hidden"
                style={{
                  perspective: "600px",
                  background: card.matched
                    ? "linear-gradient(145deg, hsl(160 80% 20%), hsl(160 60% 12%))"
                    : card.flipped
                    ? "linear-gradient(145deg, hsl(230 30% 18%), hsl(230 25% 10%))"
                    : "linear-gradient(145deg, hsl(230 25% 16%), hsl(230 30% 8%))",
                  border: `1.5px solid ${
                    isMatchFlash
                      ? "hsl(160 100% 50%)"
                      : isFailFlash
                      ? "hsl(0 100% 50%)"
                      : card.matched
                      ? "hsl(160 80% 40% / 0.6)"
                      : card.flipped
                      ? "hsl(185 100% 50% / 0.4)"
                      : "hsl(230 20% 20%)"
                  }`,
                  boxShadow: isMatchFlash
                    ? "0 0 15px hsl(160 100% 50% / 0.6), inset 0 0 10px hsl(160 100% 50% / 0.15)"
                    : isFailFlash
                    ? "0 0 15px hsl(0 100% 50% / 0.6), inset 0 0 10px hsl(0 100% 50% / 0.15)"
                    : card.matched
                    ? "0 0 12px hsl(160 80% 50% / 0.3), inset 0 1px 2px hsl(0 0% 100% / 0.05)"
                    : "inset 0 1px 2px hsl(0 0% 100% / 0.05), 0 4px 8px hsl(0 0% 0% / 0.3)",
                  transition: "border-color 0.3s, box-shadow 0.3s, background 0.3s",
                }}
              >
                {/* Card face */}
                <div className="w-full h-full flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {card.flipped || card.matched ? (
                      <motion.span
                        key="face"
                        initial={{ rotateY: 90, opacity: 0 }}
                        animate={{ rotateY: 0, opacity: 1 }}
                        exit={{ rotateY: 90, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="text-2xl sm:text-3xl select-none"
                        style={{ backfaceVisibility: "hidden" }}
                      >
                        {card.emoji}
                      </motion.span>
                    ) : (
                      <motion.span
                        key="back"
                        initial={{ rotateY: -90, opacity: 0 }}
                        animate={{ rotateY: 0, opacity: 1 }}
                        exit={{ rotateY: -90, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="text-lg text-muted-foreground/30 font-display font-bold select-none"
                      >
                        ?
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {/* Sparkle overlay */}
                {hasSparkle && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <Sparkles className="w-5 h-5 text-primary" />
                  </motion.div>
                )}

                {/* Hover glow */}
                {!card.flipped && !card.matched && (
                  <div
                    className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-xl"
                    style={{
                      background: "radial-gradient(circle, hsl(185 100% 50% / 0.08) 0%, transparent 70%)",
                    }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
        </>)}

        {/* Win / Lose Overlay */}
        <AnimatePresence>
          {(gameState === "won" || gameState === "lost") && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="gradient-card rounded-2xl border border-border/50 p-8 text-center max-w-xs mx-4"
                style={{
                  boxShadow: gameState === "won"
                    ? "0 0 40px hsl(185 100% 50% / 0.2)"
                    : "0 0 40px hsl(0 80% 50% / 0.2)",
                }}
              >
                {gameState === "won" ? (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.1 }}
                      className="text-5xl mb-3"
                    >
                      🎉
                    </motion.div>
                    <h2 className="font-display text-xl font-bold text-primary neon-text mb-2">
                      Level Clear!
                    </h2>
                    <motion.p
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.2 }}
                      className="font-display text-3xl font-black text-accent mb-1"
                    >
                      +{earnedPoints} pts
                    </motion.p>
                    <p className="text-muted-foreground text-xs mb-5">
                      Completed in {moves} moves
                    </p>
                    <button
                      onClick={nextLevel}
                      className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-display text-sm font-bold px-6 py-3 rounded-xl neon-glow hover:scale-105 transition-transform"
                    >
                      {level < 100 ? (
                        <>NEXT LEVEL <ArrowRight className="w-4 h-4" /></>
                      ) : (
                        "MAX LEVEL!"
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.1 }}
                      className="text-5xl mb-3"
                    >
                      😵
                    </motion.div>
                    <h2 className="font-display text-xl font-bold text-destructive mb-2">
                      Out of Moves!
                    </h2>
                    <p className="text-muted-foreground text-xs mb-5">
                      Used all {maxMoves} moves
                    </p>
                    <button
                      onClick={retry}
                      className="inline-flex items-center gap-2 bg-secondary text-foreground font-display text-sm font-bold px-6 py-3 rounded-xl hover:bg-secondary/80 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" /> RETRY
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

export default MemoryMatch;
