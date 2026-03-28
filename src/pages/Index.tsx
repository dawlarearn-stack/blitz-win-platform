import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Gamepad2, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import DailyRewards from "@/components/DailyRewards";
import { useGameStore } from "@/lib/gameStore";

const Index = () => {
  const { data, addPoints, addEnergy } = useGameStore();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Hero */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden pt-16 md:pt-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(145_80%_48%_/_0.06)_0%,_transparent_70%)]" />
        <div className="container relative z-10 text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-display text-4xl md:text-7xl font-black tracking-tight mb-4">
              <span className="text-foreground">PGR</span>{" "}
              <span className="text-primary neon-text">PLAY</span>
              <br />
              <span className="text-accent neon-text-accent">&</span>{" "}
              <span className="text-primary neon-text">EARN</span>
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-md mx-auto mb-8">
              Play mini games. Earn real points. Cash out real money.
            </p>
            <Link
              to="/games"
              className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-display font-bold text-sm px-8 py-4 rounded-xl neon-glow hover:scale-105 transition-transform"
            >
              START PLAYING <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Daily Rewards */}
      <DailyRewards addPoints={addPoints} addEnergy={addEnergy} progress={data.progress} />

      <div className="h-16 md:h-0" /> {/* mobile nav spacer */}
    </div>
  );
};

export default Index;
