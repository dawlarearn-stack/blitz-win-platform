import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Games from "./pages/Games";
import Dashboard from "./pages/Dashboard";
import Shop from "./pages/Shop";
import BombFinder from "./pages/BombFinder";
import MemoryMatch from "./pages/MemoryMatch";
import ReactionTap from "./pages/ReactionTap";
import LuckyBox from "./pages/LuckyBox";
import ColorMatch from "./pages/ColorMatch";
import SpeedType from "./pages/SpeedType";
import PatternMemory from "./pages/PatternMemory";
import NumberSequence from "./pages/NumberSequence";
import DiceRoll from "./pages/DiceRoll";
import WhackAMole from "./pages/WhackAMole";
import Leaderboard from "./pages/Leaderboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/games" element={<Games />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/games/bomb-finder" element={<BombFinder />} />
          <Route path="/games/memory-match" element={<MemoryMatch />} />
          <Route path="/games/reaction-tap" element={<ReactionTap />} />
          <Route path="/games/lucky-box" element={<LuckyBox />} />
          <Route path="/games/color-match" element={<ColorMatch />} />
          <Route path="/games/speed-type" element={<SpeedType />} />
          <Route path="/games/pattern-memory" element={<PatternMemory />} />
          <Route path="/games/number-sequence" element={<NumberSequence />} />
          <Route path="/games/dice-roll" element={<DiceRoll />} />
          <Route path="/games/whack-a-mole" element={<WhackAMole />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
