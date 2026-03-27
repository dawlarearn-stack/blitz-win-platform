import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Gamepad2, Coins, Trophy, Zap, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";

const features = [
  { icon: Gamepad2, title: "5 Mini Games", desc: "Bomb Finder, Memory Match, Reaction Tap, Lucky Box, Number Guess" },
  { icon: Coins, title: "Earn Points", desc: "Play games, complete levels, and stack up your points balance" },
  { icon: Trophy, title: "100 Levels", desc: "Each game has 100 levels of increasing difficulty" },
  { icon: Zap, title: "Cash Out", desc: "Convert 100,000 points to $1. Minimum withdraw $5" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16 md:pt-0">
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

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="gradient-card rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-colors"
              >
                <f.icon className="w-10 h-10 text-primary mb-4" />
                <h3 className="font-display text-sm font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center">
        <div className="container max-w-lg">
          <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground mb-4">
            Ready to <span className="text-primary neon-text">earn</span>?
          </h2>
          <p className="text-muted-foreground mb-8">Jump into any game and start stacking points today.</p>
          <Link
            to="/games"
            className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-display font-bold text-sm px-8 py-4 rounded-xl neon-glow hover:scale-105 transition-transform"
          >
            BROWSE GAMES <Gamepad2 className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <div className="h-16 md:h-0" /> {/* mobile nav spacer */}
    </div>
  );
};

export default Index;
