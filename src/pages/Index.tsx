import Navbar from "@/components/Navbar";
import DailyRewards from "@/components/DailyRewards";
import { useGameStore } from "@/lib/gameStore";

const Index = () => {
  const { data, addPoints, addEnergy } = useGameStore();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Daily Rewards */}
      <DailyRewards addPoints={addPoints} addEnergy={addEnergy} progress={data.progress} />

      <div className="h-16 md:h-0" /> {/* mobile nav spacer */}
    </div>
  );
};

export default Index;
