import { Link, useLocation } from "react-router-dom";
import { Gamepad2, Home, LayoutDashboard, Trophy, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/games", icon: Gamepad2, label: "Games" },
  { to: "/shop", icon: ShoppingCart, label: "Shop" },
  { to: "/leaderboard", icon: Trophy, label: "Board" },
  { to: "/dashboard", icon: LayoutDashboard, label: "Me" },
];

const Navbar = () => {
  const location = useLocation();

  return (
    <>
      {/* Desktop navbar */}
      <nav className="hidden md:flex fixed top-0 w-full z-50 glass border-b border-border/50">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <Gamepad2 className="w-7 h-7 text-primary" />
            <span className="font-display text-lg font-bold text-foreground">
              PGR <span className="text-primary">Play & Earn</span>
            </span>
          </Link>
          <div className="flex items-center gap-6">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  {active && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 glass border-t border-border/50">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
