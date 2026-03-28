import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize Telegram WebApp if available
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
      };
    };
  }
}

if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
  try {
    window.Telegram.WebApp.setHeaderColor("#0a0b10");
    window.Telegram.WebApp.setBackgroundColor("#0a0b10");
  } catch {}
}

createRoot(document.getElementById("root")!).render(<App />);
