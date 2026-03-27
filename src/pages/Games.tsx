import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bomb, Brain, Zap, Gift, Hash, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";

const games = [
  { id: "bomb-finder", name: "Bomb Finder", icon: Bomb, color: "text-destructive", desc: "Clear the grid without hitting bombs", available: true },
  { id: "memory-match", name: "Memory Match", icon: Brain, color: "text-primary", desc: "Flip cards and find matching pairs", available: true },
  { id: "reaction-tap", name: "Reaction Tap", icon: Zap, color: "text-accent", desc: "Tap moving targets before time runs out", available: false },
  { id: "lucky-box", name: "Lucky Box", icon: Gift, color: "text-primary", desc: "Open mystery boxes for rewards", available: false },
  { id: "number-guess", name: "Number Guess", icon: Hash, color: "text-accent", desc: "Guess the secret number", available: false },
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
                transition={{ delay: i * 0.08 }}
              >
                {game.available ? (
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
                ) : (
                  <div className="flex items-center gap-4 gradient-card rounded-2xl p-5 border border-border/30 opacity-50">
                    <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center relative">
                      <game.icon className={`w-7 h-7 ${game.color}`} />
                      <Lock className="w-4 h-4 text-muted-foreground absolute -bottom-1 -right-1" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-sm font-bold text-muted-foreground">{game.name}</h3>
                      <p className="text-muted-foreground text-xs mt-0.5">Coming Soon</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Games;
