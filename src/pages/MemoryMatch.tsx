import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, ArrowRight } from "lucide-react";
import GameLayout from "@/components/GameLayout";
import { useGameStore } from "@/lib/gameStore";

const EMOJIS = ["🎮", "🎲", "🎯", "🏆", "💎", "⚡", "🔥", "🎪", "🌟", "🎵", "🎨", "🚀", "🎁", "🃏", "🧩", "🎰"];

function getPairCount(level: number) {
  return Math.min(4 + Math.floor(level / 10), 16);
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
  // Shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

type Card = { id: number; emoji: string; flipped: boolean; matched: boolean };

const MemoryMatch = () => {
  const { data, addPoints, updateProgress } = useGameStore();
  const progress = data.progress["memory-match"];
  const [level, setLevel] = useState(progress?.currentLevel || 0);
  const [cards, setCards] = useState<Card[]>(() => generateCards(level));
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [gameState, setGameState] = useState<"playing" | "won">("playing");
  const [earnedPoints, setEarnedPoints] = useState(0);

  const pairCount = useMemo(() => getPairCount(level), [level]);

  const handleFlip = useCallback(
    (card: Card) => {
      if (gameState !== "playing" || card.flipped || card.matched || selected.length >= 2) return;

      const nextCards = cards.map((c) => (c.id === card.id ? { ...c, flipped: true } : c));
      setCards(nextCards);
      const nextSelected = [...selected, card.id];
      setSelected(nextSelected);

      if (nextSelected.length === 2) {
        setMoves((m) => m + 1);
        const [a, b] = nextSelected.map((id) => nextCards.find((c) => c.id === id)!);
        if (a.emoji === b.emoji) {
          setTimeout(() => {
            setCards((prev) => {
              const updated = prev.map((c) =>
                c.id === a.id || c.id === b.id ? { ...c, matched: true } : c
              );
              // Check win
              if (updated.every((c) => c.matched)) {
                const pts = Math.max(50, 100 + level * 8 - moves * 3);
                setEarnedPoints(pts);
                addPoints(pts);
                updateProgress("memory-match", level);
                setGameState("won");
              }
              return updated;
            });
            setSelected([]);
          }, 400);
        } else {
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === a.id || c.id === b.id ? { ...c, flipped: false } : c
              )
            );
            setSelected([]);
          }, 800);
        }
      }
    },
    [cards, selected, gameState, moves, level, addPoints, updateProgress]
  );

  const nextLevel = () => {
    const next = Math.min(level + 1, 100);
    setLevel(next);
    setCards(generateCards(next));
    setMoves(0);
    setSelected([]);
    setGameState("playing");
    setEarnedPoints(0);
  };

  const retry = () => {
    setCards(generateCards(level));
    setMoves(0);
    setSelected([]);
    setGameState("playing");
    setEarnedPoints(0);
  };

  const cols = pairCount <= 6 ? 4 : pairCount <= 10 ? 5 : 6;

  return (
    <GameLayout title="Memory Match" level={level} points={data.points}>
      <div className="w-full max-w-md">
        <div className="flex justify-between text-xs text-muted-foreground mb-3">
          <span>Pairs: {pairCount}</span>
          <span>Moves: {moves}</span>
        </div>

        <div className={`grid gap-2 mb-6`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {cards.map((card) => (
            <motion.button
              key={card.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleFlip(card)}
              className={`game-grid-cell text-2xl ${
                card.matched
                  ? "bg-primary/20 border-primary/50"
                  : card.flipped
                  ? "bg-accent/20 border-accent/50"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              <AnimatePresence mode="wait">
                {(card.flipped || card.matched) && (
                  <motion.span
                    initial={{ rotateY: 90 }}
                    animate={{ rotateY: 0 }}
                    exit={{ rotateY: 90 }}
                    className="text-xl"
                  >
                    {card.emoji}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={retry}
            className="inline-flex items-center gap-2 bg-secondary text-foreground font-display text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-secondary/80 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> RESTART
          </button>
        </div>

        <AnimatePresence>
          {gameState === "won" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="gradient-card rounded-2xl border border-border/50 p-6 text-center mt-6"
            >
              <h2 className="font-display text-xl font-bold text-primary neon-text mb-2">Matched!</h2>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="font-display text-3xl font-black text-accent mb-1"
              >
                +{earnedPoints} pts
              </motion.p>
              <p className="text-muted-foreground text-xs mb-4">Completed in {moves} moves</p>
              <button
                onClick={nextLevel}
                className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-display text-sm font-bold px-6 py-3 rounded-xl neon-glow hover:scale-105 transition-transform"
              >
                {level < 100 ? <>NEXT LEVEL <ArrowRight className="w-4 h-4" /></> : "MAX LEVEL!"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GameLayout>
  );
};

export default MemoryMatch;
