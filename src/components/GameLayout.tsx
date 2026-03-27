import { Link } from "react-router-dom";
import { ArrowLeft, Coins, Trophy } from "lucide-react";
import { motion } from "framer-motion";

interface GameLayoutProps {
  title: string;
  level: number;
  points: number;
  children: React.ReactNode;
}

const GameLayout = ({ title, level, points, children }: GameLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="glass border-b border-border/50 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link to="/games" className="text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display text-sm md:text-base font-bold text-foreground">{title}</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="font-display text-xs text-primary">LVL {level}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Coins className="w-4 h-4 text-accent" />
            <motion.span
              key={points}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="font-display text-xs text-accent"
            >
              {points.toLocaleString()}
            </motion.span>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {children}
      </main>
    </div>
  );
};

export default GameLayout;
