import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Shield, CheckCircle, XCircle, Clock, RefreshCw, Eye, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_KEY_STORAGE = "pgr_admin_key";

interface PaymentRequest {
  id: string;
  telegram_id: string | null;
  energy_amount: number;
  price_mmk: string;
  payment_method: "kpay" | "wavepay";
  receipt_last4: string;
  sender_name: string;
  sender_phone: string;
  screenshot_url: string | null;
  status: "pending" | "approved" | "rejected";
  expires_at: string;
  created_at: string;
}

type StatusFilter = "pending" | "approved" | "rejected";

const Admin = () => {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem(ADMIN_KEY_STORAGE) || "");
  const [authenticated, setAuthenticated] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!adminKey) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-payments", {
        method: "GET",
        headers: { "x-admin-key": adminKey },
        body: undefined,
      });
      // Edge function GET with query params isn't directly supported via invoke,
      // so we use the full URL approach
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/admin-payments?status=${filter}`;
      const resp = await fetch(url, {
        headers: {
          "x-admin-key": adminKey,
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      const result = await resp.json();
      if (result.error) {
        if (resp.status === 401) {
          setAuthenticated(false);
          localStorage.removeItem(ADMIN_KEY_STORAGE);
          toast.error("Admin key မမှန်ပါ");
          return;
        }
        throw new Error(result.error);
      }
      setRequests(result.data || []);
      setAuthenticated(true);
    } catch (err: any) {
      console.error(err);
      toast.error("Data ယူ၍မရပါ");
    } finally {
      setLoading(false);
    }
  }, [adminKey, filter]);

  useEffect(() => {
    if (adminKey) {
      fetchRequests();
    }
  }, [adminKey, filter, fetchRequests]);

  const handleLogin = () => {
    if (!keyInput.trim()) return;
    const key = keyInput.trim();
    localStorage.setItem(ADMIN_KEY_STORAGE, key);
    setAdminKey(key);
    setKeyInput("");
  };

  const handleAction = async (id: string, action: "approved" | "rejected") => {
    setActionLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/admin-payments`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "x-admin-key": adminKey,
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, action }),
      });
      const result = await resp.json();
      if (result.error) throw new Error(result.error);

      toast.success(action === "approved" ? "✅ Approved!" : "❌ Rejected!");
      setSelectedRequest(null);
      fetchRequests();
    } catch (err: any) {
      console.error(err);
      toast.error("Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Login screen
  if (!authenticated && !adminKey) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-card rounded-2xl p-6 border border-border/50 max-w-sm w-full space-y-4"
        >
          <div className="text-center">
            <Shield className="w-10 h-10 text-primary mx-auto mb-2" />
            <h1 className="font-display text-xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground text-xs mt-1">Admin Key ထည့်ပါ</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-display">Admin Secret Key</Label>
            <Input
              type="password"
              placeholder="Enter admin key"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="bg-muted/50 border-border/50"
            />
          </div>
          <Button className="w-full gradient-primary text-primary-foreground font-display" onClick={handleLogin}>
            <LogIn className="w-4 h-4" /> Login
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-6 pb-20 px-4">
        <div className="container max-w-2xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="font-display text-xl font-bold text-foreground">Admin Dashboard</h1>
            </div>
            <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </motion.div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-4">
            {(["pending", "approved", "rejected"] as StatusFilter[]).map((s) => (
              <Button
                key={s}
                variant={filter === s ? "default" : "outline"}
                size="sm"
                className={`font-display text-xs ${filter === s ? "gradient-primary text-primary-foreground" : ""}`}
                onClick={() => setFilter(s)}
              >
                {s === "pending" && <Clock className="w-3 h-3" />}
                {s === "approved" && <CheckCircle className="w-3 h-3" />}
                {s === "rejected" && <XCircle className="w-3 h-3" />}
                {s.charAt(0).toUpperCase() + s.slice(1)}
                {s === "pending" && requests.length > 0 && (
                  <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">
                    {requests.length}
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          {/* Requests list */}
          <ScrollArea className="h-[calc(100vh-200px)]">
            {loading ? (
              <div className="text-center py-10 text-muted-foreground text-sm font-display">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm font-display">
                {filter} requests မရှိပါ
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="gradient-card rounded-xl p-4 border border-border/50 hover:border-primary/30 transition-all cursor-pointer"
                    onClick={() => setSelectedRequest(req)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={req.payment_method === "kpay" ? "default" : "secondary"}
                          className="text-[10px] font-display"
                        >
                          {req.payment_method.toUpperCase()}
                        </Badge>
                        <span className="font-display text-sm font-bold text-foreground">
                          +{req.energy_amount.toLocaleString()} Energy
                        </span>
                      </div>
                      <span className="text-primary font-display text-xs font-bold">{req.price_mmk}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>TG: {req.telegram_id || "N/A"}</span>
                      <span>{new Date(req.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                      <span>{req.sender_name} • {req.sender_phone}</span>
                      <span>Receipt: ...{req.receipt_last4}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={selectedRequest !== null} onOpenChange={(o) => !o && setSelectedRequest(null)}>
        {selectedRequest && (
          <DialogContent className="gradient-card border-border/50 max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display text-foreground">Payment Details</DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                ID: {selectedRequest.id.slice(0, 8)}...
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <InfoRow label="Telegram ID" value={selectedRequest.telegram_id || "N/A"} />
              <InfoRow label="Energy" value={`+${selectedRequest.energy_amount.toLocaleString()}`} />
              <InfoRow label="Price" value={selectedRequest.price_mmk} />
              <InfoRow label="Method" value={selectedRequest.payment_method.toUpperCase()} />
              <InfoRow label="Sender" value={selectedRequest.sender_name} />
              <InfoRow label="Phone" value={selectedRequest.sender_phone} />
              <InfoRow label="Receipt Last 4" value={selectedRequest.receipt_last4} />
              <InfoRow label="Created" value={new Date(selectedRequest.created_at).toLocaleString()} />
              <InfoRow label="Expires" value={new Date(selectedRequest.expires_at).toLocaleString()} />

              {selectedRequest.screenshot_url && (
                <div>
                  <p className="text-muted-foreground text-[10px] font-display mb-1">Screenshot</p>
                  <a href={selectedRequest.screenshot_url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={selectedRequest.screenshot_url}
                      alt="Payment screenshot"
                      className="w-full rounded-lg border border-border/50 max-h-48 object-contain"
                    />
                  </a>
                </div>
              )}
            </div>

            {selectedRequest.status === "pending" && (
              <div className="flex gap-3 mt-2">
                <Button
                  variant="outline"
                  className="flex-1 font-display border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => handleAction(selectedRequest.id, "rejected")}
                  disabled={actionLoading}
                >
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
                <Button
                  className="flex-1 gradient-primary text-primary-foreground font-display"
                  onClick={() => handleAction(selectedRequest.id, "approved")}
                  disabled={actionLoading}
                >
                  <CheckCircle className="w-4 h-4" /> Approve
                </Button>
              </div>
            )}

            {selectedRequest.status !== "pending" && (
              <Badge
                variant={selectedRequest.status === "approved" ? "default" : "destructive"}
                className="w-full justify-center py-2 font-display"
              >
                {selectedRequest.status === "approved" ? "✅ Approved" : "❌ Rejected"}
              </Badge>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-xs font-display">{label}</span>
      <span className="text-foreground text-sm font-display font-bold">{value}</span>
    </div>
  );
}

export default Admin;
