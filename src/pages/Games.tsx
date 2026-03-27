import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bomb, Brain, Zap, Gift, Palette, Keyboard, Grid3X3, CircleDot, Dice1, Search, Calculator, Type } from "lucide-react";
import Navbar from "@/components/Navbar";

const games = [
  { id: "bomb-finder", name: "Bomb Finder", icon: Bomb, color: "text-destructive", desc: "Clear the grid without hitting bombs", available: true },
  { id: "memory-match", name: "Memory Match", icon: Brain, color: "text-primary", desc: "Flip cards and find matching pairs", available: true },
  { id: "reaction-tap", name: "Reaction Tap", icon: Zap, color: "text-accent", desc: "Tap moving targets before time runs out", available: true },
  { id: "lucky-box", name: "Lucky Box", icon: Gift, color: "text-primary", desc: "Open mystery boxes for rewards", available: true },
  { id: "color-match", name: "Color Match", icon: Palette, color: "text-accent", desc: "Match the displayed color, not the word", available: true },
  { id: "speed-type", name: "Speed Type", icon: Keyboard, color: "text-primary", desc: "Type words as fast as you can", available: true },
  { id: "pattern-memory", name: "Pattern Memory", icon: Grid3X3, color: "text-accent", desc: "Remember and repeat the pattern", available: true },
  { id: "coin-flip", name: "Coin Flip", icon: CircleDot, color: "text-primary", desc: "Predict coin flips in a streak", available: true },
  { id: "dice-roll", name: "Dice Roll", icon: Dice1, color: "text-accent", desc: "Predict dice totals: high, low, or seven", available: true },
];

const Games = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 md:pt-24 pb-20 px-4">
        <div className="container max-w-3xl">
          <h1 className="font-display text-2xl md:text-4xl font-bold text-foreground mb-2">Games</h1>
          <p className="text-muted-foreground mb-8">Choose a game and start earning points.</p>
          <div className="grid gap-4">
            {games.map((game, i) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/games/${game.id}`}
                  className="flex items-center gap-4 gradient-card rounded-2xl p-5 border border-border/50 hover:border-primary/40 hover:neon-glow transition-all group"
                >
                  <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center">
                    <game.icon className={`w-7 h-7 ${game.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {game.name}
                    </h3>
                    <p className="text-muted-foreground text-xs mt-0.5">{game.desc}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Games;
