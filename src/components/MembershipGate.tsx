import { useEffect, useState } from "react";
import { getTelegramId } from "@/lib/fingerprint";
import { Loader2, ShieldAlert, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function MembershipGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "verified" | "blocked">("loading");
  const [inChannel, setInChannel] = useState(false);
  const [inGroup, setInGroup] = useState(false);
  const telegramId = getTelegramId();

  // Skip gate for dev/guest users
  const isDevUser = telegramId.startsWith("dev-") || telegramId.startsWith("guest_");

  const checkMembership = async () => {
    if (isDevUser) {
      setStatus("verified");
      return;
    }

    setStatus("loading");
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/check-membership`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ telegram_id: telegramId }),
      });
      const data = await resp.json();
      if (data.verified) {
        setStatus("verified");
      } else {
        setInChannel(data.inChannel ?? false);
        setInGroup(data.inGroup ?? false);
        setStatus("blocked");
      }
    } catch {
      // On error, allow access to not block legitimate users
      setStatus("verified");
    }
  };

  useEffect(() => {
    checkMembership();
  }, [telegramId]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Verifying membership...</p>
        </div>
      </div>
    );
  }

  if (status === "blocked") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full text-center space-y-6"
        >
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="font-display text-2xl font-bold text-foreground">
            Access Restricted
          </h1>
          <p className="text-muted-foreground text-sm">
            You must join both our official channel and community group to use PGRmm.
          </p>

          <div className="space-y-3">
            <a
              href="https://t.me/pgrmmofficial"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full block"
            >
              <Button
                variant={inChannel ? "outline" : "default"}
                className="w-full gap-2"
                disabled={inChannel}
              >
                {inChannel ? "✅" : <ExternalLink className="w-4 h-4" />}
                {inChannel ? "Channel Joined" : "Join Channel @pgrmmofficial"}
              </Button>
            </a>

            <a
              href="https://t.me/pgrmCommunity"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full block"
            >
              <Button
                variant={inGroup ? "outline" : "default"}
                className="w-full gap-2"
                disabled={inGroup}
              >
                {inGroup ? "✅" : <ExternalLink className="w-4 h-4" />}
                {inGroup ? "Group Joined" : "Join Group @pgrmCommunity"}
              </Button>
            </a>
          </div>

          <Button
            onClick={checkMembership}
            variant="secondary"
            className="w-full"
          >
            🔄 Check Again
          </Button>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
