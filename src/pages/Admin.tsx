import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Shield, CheckCircle, XCircle, Clock, RefreshCw, LogIn,
  Wallet, Zap, Users, Activity, Settings, Save, Plus, Trash2, ArrowRightLeft, AlertTriangle, Ban, ShieldCheck,
  Megaphone, Send, Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { adminGet, adminPost } from "@/lib/api";

const ADMIN_KEY_STORAGE = "pgr_admin_key";

interface PaymentRequest {
  id: string;
  telegram_id: string | null;
  energy_amount: number;
  price_mmk: string;
  payment_method: "kpay" | "wavepay" | "binance";
  receipt_last4: string;
  sender_name: string;
  sender_phone: string;
  screenshot_url: string | null;
  status: "pending" | "approved" | "rejected";
  expires_at: string;
  created_at: string;
}

interface WithdrawalRequest {
  id: string;
  telegram_id: string;
  withdrawal_method: "binance_id" | "bep20" | "kbz_pay" | "wave_pay";
  amount_points: number;
  amount_usd: string | null;
  amount_mmk: string | null;
  currency: string;
  binance_account_name: string | null;
  binance_uid: string | null;
  bep20_address: string | null;
  account_name: string | null;
  phone_number: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

interface EnergyPack {
  energy: number;
  priceUSD: string;
  priceMMK: string;
}

interface ConversionOption {
  energy: number;
  pointsCost: number;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  pendingPayments: number;
  pendingWithdrawals: number;
  suspiciousCount: number;
  totalPoints: number;
}

interface SuspiciousLog {
  id: string;
  telegram_id: string;
  action_type: string;
  details: any;
  ip_address: string | null;
  device_info: string | null;
  created_at: string;
}

interface BannedUser {
  telegram_id: string;
  reason: string | null;
  banned_at: string;
  unbanned_at: string | null;
}

type StatusFilter = "pending" | "approved" | "rejected";
type TabType = "payments" | "withdrawals" | "config" | "security" | "banned" | "announce";

const Admin = () => {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem(ADMIN_KEY_STORAGE) || "");
  const [authenticated, setAuthenticated] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [tab, setTab] = useState<TabType>("payments");
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, activeUsers: 0, pendingPayments: 0, pendingWithdrawals: 0, suspiciousCount: 0, totalPoints: 0 });
  const [suspiciousLogs, setSuspiciousLogs] = useState<SuspiciousLog[]>([]);
  const [bannedUsers, setBannedUsers] = useState<Record<string, { reason: string; unbanned_at: string | null }>>({});
  const [bannedList, setBannedList] = useState<BannedUser[]>([]);
  const [firstAccounts, setFirstAccounts] = useState<Record<string, string>>({});
  const [banLoading, setBanLoading] = useState<string | null>(null);

  // Config
  const [energyPacks, setEnergyPacks] = useState<EnergyPack[]>([]);
  const [conversions, setConversions] = useState<ConversionOption[]>([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [adsgramBlockId, setAdsgramBlockId] = useState<string>("26550");

  // Announcement
  const [announceTarget, setAnnounceTarget] = useState<"all" | "single">("all");
  const [announceTelegramId, setAnnounceTelegramId] = useState("");
  const [announceMessage, setAnnounceMessage] = useState("");
  const [announceSending, setAnnounceSending] = useState(false);

  const baseUrl = import.meta.env.VITE_API_MODE === "selfhost" 
    ? (import.meta.env.VITE_API_BASE || "") 
    : import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  const getEndpoint = (name: string) => {
    if (import.meta.env.VITE_API_MODE === "selfhost") return `${baseUrl}/api/${name}`;
    return `${baseUrl}/functions/v1/${name}`;
  };
  
  const getAuthHeaders = (): Record<string, string> => {
    if (import.meta.env.VITE_API_MODE === "selfhost") return {};
    return { Authorization: `Bearer ${anonKey}` };
  };

  const fetchStats = useCallback(async () => {
    if (!adminKey) return;
    try {
      const resp = await fetch(getEndpoint("admin-stats"), {
        headers: { "x-admin-key": adminKey, ...getAuthHeaders() },
      });
      const data = await resp.json();
      if (resp.ok) setStats(data);
    } catch {}
  }, [adminKey, baseUrl, anonKey]);

  const fetchConfig = useCallback(async () => {
    if (!adminKey) return;
    setConfigLoading(true);
    try {
      const resp = await fetch(getEndpoint("admin-stats?action=config"), {
        headers: { "x-admin-key": adminKey, ...getAuthHeaders() },
      });
      const result = await resp.json();
      if (result.data) {
        for (const item of result.data) {
          if (item.key === "energy_packs") setEnergyPacks(item.value);
          if (item.key === "point_conversions") setConversions(item.value);
          if (item.key === "adsgram_block_id") setAdsgramBlockId(String(item.value || "26550"));
        }
      }
    } catch {}
    setConfigLoading(false);
  }, [adminKey, baseUrl, anonKey]);

  const fetchData = useCallback(async () => {
    if (!adminKey || tab === "config" || tab === "security" || tab === "banned" || tab === "announce") return;
    setLoading(true);
    try {
      const endpoint = tab === "payments" ? "admin-payments" : "admin-withdrawals";
      const resp = await fetch(getEndpoint(`${endpoint}?status=${filter}`), {
        headers: { "x-admin-key": adminKey, ...getAuthHeaders() },
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
      if (tab === "payments") setRequests(result.data || []);
      else setWithdrawals(result.data || []);
      setAuthenticated(true);
    } catch (err: any) {
      console.error(err);
      toast.error("Data ယူ၍မရပါ");
    } finally {
      setLoading(false);
    }
  }, [adminKey, filter, tab, baseUrl, anonKey]);

  const fetchSuspicious = useCallback(async () => {
    if (!adminKey) return;
    setLoading(true);
    try {
      const resp = await fetch(getEndpoint("admin-stats?action=suspicious"), {
        headers: { "x-admin-key": adminKey, ...getAuthHeaders() },
      });
      const result = await resp.json();
      if (resp.ok) {
        if (result.data) setSuspiciousLogs(result.data);
        if (result.banned) {
          const banMap: Record<string, { reason: string; unbanned_at: string | null }> = {};
          for (const b of result.banned) {
            banMap[b.telegram_id] = { reason: b.reason, unbanned_at: b.unbanned_at };
          }
          setBannedUsers(banMap);
        }
        if (result.firstAccounts) setFirstAccounts(result.firstAccounts);
      }
    } catch {}
    setLoading(false);
  }, [adminKey, baseUrl, anonKey]);

  const fetchBanned = useCallback(async () => {
    if (!adminKey) return;
    setLoading(true);
    try {
      const resp = await fetch(getEndpoint("admin-stats?action=banned"), {
        headers: { "x-admin-key": adminKey, ...getAuthHeaders() },
      });
      const result = await resp.json();
      if (resp.ok && result.data) {
        setBannedList(result.data);
      }
    } catch {}
    setLoading(false);
  }, [adminKey, baseUrl, anonKey]);

  const handleBanAction = async (telegramId: string, action: "ban" | "unban") => {
    setBanLoading(telegramId);
    try {
      const resp = await fetch(getEndpoint("admin-stats"), {
        method: "POST",
        headers: { "x-admin-key": adminKey, ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action, telegram_id: telegramId, reason: "Banned from admin dashboard" }),
      });
      const result = await resp.json();
      if (result.error) throw new Error(result.error);
      toast.success(action === "ban" ? "🚫 Banned!" : "✅ Unbanned!");
      if (tab === "security") fetchSuspicious();
      if (tab === "banned") fetchBanned();
    } catch {
      toast.error("Action failed");
    } finally {
      setBanLoading(null);
    }
  };

  const handleAnnounce = async () => {
    if (!announceMessage.trim()) {
      toast.error("စာသားထည့်ပါ");
      return;
    }
    if (announceTarget === "single" && !announceTelegramId.trim()) {
      toast.error("Telegram ID ထည့်ပါ");
      return;
    }
    setAnnounceSending(true);
    try {
      const resp = await fetch(getEndpoint("admin-announce"), {
        method: "POST",
        headers: { "x-admin-key": adminKey, ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          target: announceTarget === "all" ? "all" : announceTelegramId.trim(),
          message: announceMessage.trim(),
        }),
      });
      const result = await resp.json();
      if (result.error) throw new Error(result.error);
      toast.success(`📢 ပို့ပြီး! Sent: ${result.sent}, Failed: ${result.failed}`);
      setAnnounceMessage("");
      setAnnounceTelegramId("");
    } catch (err: any) {
      toast.error(`ပို့၍မရပါ: ${err.message}`);
    } finally {
      setAnnounceSending(false);
    }
  };

  useEffect(() => {
    if (adminKey) {
      fetchStats();
      if (tab === "config") fetchConfig();
      else if (tab === "security") fetchSuspicious();
      else if (tab === "banned") fetchBanned();
      else if (tab === "announce") { /* no fetch needed */ }
      else fetchData();
    }
  }, [adminKey, filter, tab, fetchData, fetchStats, fetchConfig]);

  // Auto-refresh stats every 30s
  useEffect(() => {
    if (!adminKey) return;
    const interval = setInterval(fetchStats, 30_000);
    return () => clearInterval(interval);
  }, [adminKey, fetchStats]);

  const handleLogin = () => {
    if (!keyInput.trim()) return;
    const key = keyInput.trim();
    localStorage.setItem(ADMIN_KEY_STORAGE, key);
    setAdminKey(key);
    setKeyInput("");
  };

  const handlePaymentAction = async (id: string, action: "approved" | "rejected") => {
    setActionLoading(true);
    try {
      const resp = await fetch(getEndpoint("admin-payments"), {
        method: "POST",
        headers: { "x-admin-key": adminKey, ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const result = await resp.json();
      if (result.error) throw new Error(result.error);
      toast.success(action === "approved" ? "✅ Approved!" : "❌ Rejected!");
      setSelectedRequest(null);
      fetchData();
      fetchStats();
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdrawalAction = async (id: string, action: "approved" | "rejected") => {
    setActionLoading(true);
    try {
      const resp = await fetch(getEndpoint("admin-withdrawals"), {
        method: "POST",
        headers: { "x-admin-key": adminKey, ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const result = await resp.json();
      if (result.error) throw new Error(result.error);
      toast.success(action === "approved" ? "✅ Approved!" : "❌ Rejected!");
      setSelectedWithdrawal(null);
      fetchData();
      fetchStats();
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const saveConfig = async (key: string, value: any) => {
    try {
      const resp = await fetch(getEndpoint("admin-stats"), {
        method: "POST",
        headers: { "x-admin-key": adminKey, ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const result = await resp.json();
      if (result.error) throw new Error(result.error);
      toast.success("✅ Saved!");
    } catch {
      toast.error("Save failed");
    }
  };

  const methodLabels: Record<string, string> = {
    binance_id: "Binance ID",
    bep20: "BEP20 (BSC)",
    kbz_pay: "KBZ Pay",
    wave_pay: "WavePay",
  };

  // Login screen
  if (!authenticated && !adminKey) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="gradient-card rounded-2xl p-6 border border-border/50 max-w-sm w-full space-y-4">
          <div className="text-center">
            <Shield className="w-10 h-10 text-primary mx-auto mb-2" />
            <h1 className="font-display text-xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground text-xs mt-1">Admin Key ထည့်ပါ</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-display">Admin Secret Key</Label>
            <Input type="password" placeholder="Enter admin key" value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="bg-muted/50 border-border/50" />
          </div>
          <Button className="w-full gradient-primary text-primary-foreground font-display" onClick={handleLogin}>
            <LogIn className="w-4 h-4" /> Login
          </Button>
        </motion.div>
      </div>
    );
  }

  const currentList = tab === "payments" ? requests : withdrawals;

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-6 pb-20 px-4">
        <div className="container max-w-2xl">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="font-display text-xl font-bold text-foreground">Admin</h1>
            </div>
            <Button variant="outline" size="sm" onClick={() => { fetchData(); fetchStats(); if (tab === "config") fetchConfig(); if (tab === "security") fetchSuspicious(); if (tab === "banned") fetchBanned(); }} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </motion.div>

          {/* Stats Cards */}
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-3 mb-4">
            <StatsCard icon={<Users className="w-4 h-4" />} label="Total Users" value={stats.totalUsers} color="text-primary" />
            <StatsCard icon={<Activity className="w-4 h-4" />} label="Online Now" value={stats.activeUsers} color="text-green-500" pulse />
            <StatsCard icon={<Zap className="w-4 h-4" />} label="Pending Payments" value={stats.pendingPayments} color="text-yellow-500" />
            <StatsCard icon={<Wallet className="w-4 h-4" />} label="Pending Withdrawals" value={stats.pendingWithdrawals} color="text-accent" />
            <StatsCard icon={<AlertTriangle className="w-4 h-4" />} label="Suspicious" value={stats.suspiciousCount} color="text-destructive" />
            <StatsCard icon={<Trophy className="w-4 h-4" />} label="Total Points" value={stats.totalPoints} color="text-primary" />
          </motion.div>

          {/* Tab switcher */}
          <div className="flex gap-1.5 mb-4 flex-wrap">
            <Button variant={tab === "payments" ? "default" : "outline"} size="sm"
              className={`font-display text-xs ${tab === "payments" ? "gradient-primary text-primary-foreground" : ""}`}
              onClick={() => { setTab("payments"); setFilter("pending"); }}>
              <Zap className="w-3 h-3" /> Payments
            </Button>
            <Button variant={tab === "withdrawals" ? "default" : "outline"} size="sm"
              className={`font-display text-xs ${tab === "withdrawals" ? "gradient-primary text-primary-foreground" : ""}`}
              onClick={() => { setTab("withdrawals"); setFilter("pending"); }}>
              <Wallet className="w-3 h-3" /> Withdrawals
            </Button>
            <Button variant={tab === "config" ? "default" : "outline"} size="sm"
              className={`font-display text-xs ${tab === "config" ? "gradient-primary text-primary-foreground" : ""}`}
              onClick={() => setTab("config")}>
              <Settings className="w-3 h-3" /> Pricing
            </Button>
            <Button variant={tab === "security" ? "default" : "outline"} size="sm"
              className={`font-display text-xs ${tab === "security" ? "gradient-primary text-primary-foreground" : ""}`}
              onClick={() => setTab("security")}>
              <AlertTriangle className="w-3 h-3" /> Security
            </Button>
            <Button variant={tab === "banned" ? "default" : "outline"} size="sm"
              className={`font-display text-xs ${tab === "banned" ? "gradient-primary text-primary-foreground" : ""}`}
              onClick={() => setTab("banned")}>
              <Ban className="w-3 h-3" /> Banned
            </Button>
            <Button variant={tab === "announce" ? "default" : "outline"} size="sm"
              className={`font-display text-xs ${tab === "announce" ? "gradient-primary text-primary-foreground" : ""}`}
              onClick={() => setTab("announce")}>
              <Megaphone className="w-3 h-3" /> Announce
            </Button>
          </div>

          {/* Announce Tab */}
          {tab === "announce" ? (
            <div className="space-y-4">
              <div className="gradient-card rounded-xl border border-border/50 p-4 space-y-4">
                <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-primary" /> Announcement ပို့ရန်
                </h3>

                {/* Target selector */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground font-display">ပို့မည့်ပုံစံ</Label>
                  <div className="flex gap-2">
                    <Button variant={announceTarget === "all" ? "default" : "outline"} size="sm"
                      className={`font-display text-xs flex-1 ${announceTarget === "all" ? "gradient-primary text-primary-foreground" : ""}`}
                      onClick={() => setAnnounceTarget("all")}>
                      <Users className="w-3 h-3" /> All Users
                    </Button>
                    <Button variant={announceTarget === "single" ? "default" : "outline"} size="sm"
                      className={`font-display text-xs flex-1 ${announceTarget === "single" ? "gradient-primary text-primary-foreground" : ""}`}
                      onClick={() => setAnnounceTarget("single")}>
                      <Send className="w-3 h-3" /> Single User
                    </Button>
                  </div>
                </div>

                {/* Telegram ID input (single user) */}
                {announceTarget === "single" && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-display">Telegram ID</Label>
                    <Input placeholder="e.g. 123456789" value={announceTelegramId}
                      onChange={(e) => setAnnounceTelegramId(e.target.value)}
                      className="bg-muted/50 border-border/50" />
                  </div>
                )}

                {/* Message */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground font-display">စာသား</Label>
                  <Textarea placeholder="ပို့ချင်တဲ့စာသားကိုရေးပါ..." value={announceMessage}
                    onChange={(e) => setAnnounceMessage(e.target.value)}
                    className="bg-muted/50 border-border/50 min-h-[120px]" />
                </div>

                {/* Send button */}
                <Button className="w-full gradient-primary text-primary-foreground font-display"
                  onClick={handleAnnounce} disabled={announceSending}>
                  <Send className="w-4 h-4" />
                  {announceSending ? "ပို့နေပါသည်..." : announceTarget === "all" ? "အားလုံးကိုပို့မည်" : "ပို့မည်"}
                </Button>
              </div>
            </div>
          ) : tab === "banned" ? (
            <ScrollArea className="h-[calc(100vh-420px)]">
              {loading ? (
                <div className="text-center py-10 text-muted-foreground text-sm font-display">Loading...</div>
              ) : bannedList.length === 0 ? (
                <div className="text-center py-10">
                  <ShieldCheck className="w-10 h-10 text-primary mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground text-sm font-display">Ban ထားတဲ့ user မရှိပါ</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bannedList.map((user) => {
                    const isActive = !user.unbanned_at;
                    return (
                      <motion.div key={user.telegram_id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                        className={`gradient-card rounded-xl p-4 border ${isActive ? "border-destructive/50 bg-destructive/5" : "border-border/50"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-sm font-bold text-foreground">{user.telegram_id}</span>
                            {isActive ? (
                              <Badge variant="destructive" className="text-[10px] font-display">
                                <Ban className="w-3 h-3 mr-1" /> BANNED
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] font-display border-green-500/50 text-green-500">
                                <ShieldCheck className="w-3 h-3 mr-1" /> UNBANNED
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Reason</span>
                            <span className="text-foreground">{user.reason || "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Banned At</span>
                            <span className="text-foreground">{new Date(user.banned_at).toLocaleString()}</span>
                          </div>
                          {user.unbanned_at && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Unbanned At</span>
                              <span className="text-foreground">{new Date(user.unbanned_at).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 mt-3">
                          {isActive ? (
                            <Button variant="outline" size="sm" className="flex-1 font-display text-xs border-primary/30 text-primary hover:bg-primary/10"
                              onClick={() => handleBanAction(user.telegram_id, "unban")} disabled={banLoading === user.telegram_id}>
                              <ShieldCheck className="w-3 h-3" /> {banLoading === user.telegram_id ? "..." : "Unban"}
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" className="flex-1 font-display text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                              onClick={() => handleBanAction(user.telegram_id, "ban")} disabled={banLoading === user.telegram_id}>
                              <Ban className="w-3 h-3" /> {banLoading === user.telegram_id ? "..." : "Re-Ban"}
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          ) : tab === "security" ? (
            <ScrollArea className="h-[calc(100vh-420px)]">
              {loading ? (
                <div className="text-center py-10 text-muted-foreground text-sm font-display">Loading...</div>
              ) : suspiciousLogs.length === 0 ? (
                <div className="text-center py-10">
                  <Shield className="w-10 h-10 text-primary mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground text-sm font-display">No suspicious activity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suspiciousLogs.map((log) => {
                    const isBanned = bannedUsers[log.telegram_id] && !bannedUsers[log.telegram_id].unbanned_at;
                    const isMultiAccount = log.action_type === "multi_account_fingerprint";
                    const fp = log.details?.fingerprint;
                    const isFirstAccount = isMultiAccount && fp && firstAccounts[fp] === log.telegram_id;

                    return (
                      <motion.div key={log.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                        className={`gradient-card rounded-xl p-4 border ${isBanned ? "border-destructive/50 bg-destructive/5" : "border-border/50"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="text-[10px] font-display">
                              {log.action_type.replace(/_/g, " ").toUpperCase()}
                            </Badge>
                            {isBanned && (
                              <Badge variant="outline" className="text-[10px] font-display border-destructive/50 text-destructive">
                                <Ban className="w-3 h-3 mr-1" /> BANNED
                              </Badge>
                            )}
                          </div>
                          <span className="text-muted-foreground text-[10px]">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Telegram ID</span>
                            <span className="text-foreground font-bold">{log.telegram_id}</span>
                          </div>
                          {isMultiAccount && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Account Type</span>
                              {isFirstAccount ? (
                                <Badge variant="outline" className="text-[10px] border-primary/50 text-primary">
                                  <ShieldCheck className="w-3 h-3 mr-1" /> ORIGINAL
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] border-yellow-500/50 text-yellow-500">
                                  <AlertTriangle className="w-3 h-3 mr-1" /> DUPLICATE
                                </Badge>
                              )}
                            </div>
                          )}
                          {log.ip_address && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">IP</span>
                              <span className="text-foreground">{log.ip_address}</span>
                            </div>
                          )}
                          {log.device_info && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Device</span>
                              <span className="text-foreground text-[10px] max-w-[200px] truncate">{log.device_info}</span>
                            </div>
                          )}
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="mt-2 p-2 rounded-lg bg-secondary/50 text-[10px] text-muted-foreground font-mono break-all">
                              {JSON.stringify(log.details, null, 2)}
                            </div>
                          )}
                        </div>
                        {/* Ban/Unban buttons */}
                        <div className="flex gap-2 mt-3">
                          {isBanned ? (
                            <Button variant="outline" size="sm" className="flex-1 font-display text-xs border-primary/30 text-primary hover:bg-primary/10"
                              onClick={() => handleBanAction(log.telegram_id, "unban")} disabled={banLoading === log.telegram_id}>
                              <ShieldCheck className="w-3 h-3" /> {banLoading === log.telegram_id ? "..." : "Unban"}
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" className="flex-1 font-display text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                              onClick={() => handleBanAction(log.telegram_id, "ban")} disabled={banLoading === log.telegram_id}>
                              <Ban className="w-3 h-3" /> {banLoading === log.telegram_id ? "..." : "Ban"}
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          ) : tab === "config" ? (
            <ConfigPanel
              energyPacks={energyPacks}
              conversions={conversions}
              setEnergyPacks={setEnergyPacks}
              setConversions={setConversions}
              adsgramBlockId={adsgramBlockId}
              setAdsgramBlockId={setAdsgramBlockId}
              onSave={saveConfig}
              loading={configLoading}
            />
          ) : (
            <>
              {/* Status filter */}
              <div className="flex gap-2 mb-4">
                {(["pending", "approved", "rejected"] as StatusFilter[]).map((s) => (
                  <Button key={s} variant={filter === s ? "default" : "outline"} size="sm"
                    className={`font-display text-xs ${filter === s ? "gradient-primary text-primary-foreground" : ""}`}
                    onClick={() => setFilter(s)}>
                    {s === "pending" && <Clock className="w-3 h-3" />}
                    {s === "approved" && <CheckCircle className="w-3 h-3" />}
                    {s === "rejected" && <XCircle className="w-3 h-3" />}
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                    {s === "pending" && currentList.length > 0 && (
                      <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">{currentList.length}</Badge>
                    )}
                  </Button>
                ))}
              </div>

              {/* List */}
              <ScrollArea className="h-[calc(100vh-420px)]">
                {loading ? (
                  <div className="text-center py-10 text-muted-foreground text-sm font-display">Loading...</div>
                ) : currentList.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm font-display">{filter} requests မရှိပါ</div>
                ) : tab === "payments" ? (
                  <div className="space-y-3">
                    {requests.map((req) => (
                      <motion.div key={req.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                        className="gradient-card rounded-xl p-4 border border-border/50 hover:border-primary/30 transition-all cursor-pointer"
                        onClick={() => setSelectedRequest(req)}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={req.payment_method === "kpay" ? "default" : req.payment_method === "binance" ? "outline" : "secondary"}
                              className={`text-[10px] font-display ${req.payment_method === "binance" ? "border-yellow-500/50 text-yellow-500" : ""}`}>
                              {req.payment_method.toUpperCase()}
                            </Badge>
                            <span className="font-display text-sm font-bold text-foreground">+{req.energy_amount.toLocaleString()} Energy</span>
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
                ) : (
                  <div className="space-y-3">
                    {withdrawals.map((w) => (
                      <motion.div key={w.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                        className="gradient-card rounded-xl p-4 border border-border/50 hover:border-accent/30 transition-all cursor-pointer"
                        onClick={() => setSelectedWithdrawal(w)}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline"
                              className={`text-[10px] font-display ${w.withdrawal_method.includes("binance") || w.withdrawal_method === "bep20" ? "border-yellow-500/50 text-yellow-500" : "border-primary/50 text-primary"}`}>
                              {methodLabels[w.withdrawal_method] || w.withdrawal_method}
                            </Badge>
                            <span className="font-display text-sm font-bold text-foreground">
                              {w.currency === "USD" ? `$${w.amount_usd}` : w.amount_mmk}
                            </span>
                          </div>
                          <span className="text-accent font-display text-xs font-bold">{w.amount_points.toLocaleString()} pts</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>TG: {w.telegram_id}</span>
                          <span>{new Date(w.created_at).toLocaleString()}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          )}
        </div>
      </div>

      {/* Payment Detail Modal */}
      <Dialog open={selectedRequest !== null} onOpenChange={(o) => !o && setSelectedRequest(null)}>
        {selectedRequest && (
          <DialogContent className="gradient-card border-border/50 max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display text-foreground">Payment Details</DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">ID: {selectedRequest.id.slice(0, 8)}...</DialogDescription>
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
                    <img src={selectedRequest.screenshot_url} alt="Payment screenshot" className="w-full rounded-lg border border-border/50 max-h-48 object-contain" />
                  </a>
                </div>
              )}
            </div>
            {selectedRequest.status === "pending" && (
              <div className="flex gap-3 mt-2">
                <Button variant="outline" className="flex-1 font-display border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => handlePaymentAction(selectedRequest.id, "rejected")} disabled={actionLoading}>
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
                <Button className="flex-1 gradient-primary text-primary-foreground font-display"
                  onClick={() => handlePaymentAction(selectedRequest.id, "approved")} disabled={actionLoading}>
                  <CheckCircle className="w-4 h-4" /> Approve
                </Button>
              </div>
            )}
            {selectedRequest.status !== "pending" && (
              <Badge variant={selectedRequest.status === "approved" ? "default" : "destructive"} className="w-full justify-center py-2 font-display">
                {selectedRequest.status === "approved" ? "✅ Approved" : "❌ Rejected"}
              </Badge>
            )}
          </DialogContent>
        )}
      </Dialog>

      {/* Withdrawal Detail Modal */}
      <Dialog open={selectedWithdrawal !== null} onOpenChange={(o) => !o && setSelectedWithdrawal(null)}>
        {selectedWithdrawal && (
          <DialogContent className="gradient-card border-border/50 max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display text-foreground">Withdrawal Details</DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">ID: {selectedWithdrawal.id.slice(0, 8)}...</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <InfoRow label="Telegram ID" value={selectedWithdrawal.telegram_id} />
              <InfoRow label="Currency" value={selectedWithdrawal.currency} />
              <InfoRow label="Amount" value={selectedWithdrawal.currency === "USD" ? `$${selectedWithdrawal.amount_usd}` : `${selectedWithdrawal.amount_mmk}`} />
              <InfoRow label="Points" value={selectedWithdrawal.amount_points.toLocaleString()} />
              <InfoRow label="Method" value={methodLabels[selectedWithdrawal.withdrawal_method] || selectedWithdrawal.withdrawal_method} />
              {selectedWithdrawal.binance_account_name && <InfoRow label="Binance Name" value={selectedWithdrawal.binance_account_name} />}
              {selectedWithdrawal.binance_uid && <InfoRow label="Binance UID" value={selectedWithdrawal.binance_uid} />}
              {selectedWithdrawal.bep20_address && <InfoRow label="BEP20 Address" value={selectedWithdrawal.bep20_address} />}
              {selectedWithdrawal.account_name && <InfoRow label="Account Name" value={selectedWithdrawal.account_name} />}
              {selectedWithdrawal.phone_number && <InfoRow label="Phone" value={selectedWithdrawal.phone_number} />}
              <InfoRow label="Created" value={new Date(selectedWithdrawal.created_at).toLocaleString()} />
            </div>
            {selectedWithdrawal.status === "pending" && (
              <div className="flex gap-3 mt-2">
                <Button variant="outline" className="flex-1 font-display border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => handleWithdrawalAction(selectedWithdrawal.id, "rejected")} disabled={actionLoading}>
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
                <Button className="flex-1 gradient-primary text-primary-foreground font-display"
                  onClick={() => handleWithdrawalAction(selectedWithdrawal.id, "approved")} disabled={actionLoading}>
                  <CheckCircle className="w-4 h-4" /> Approve
                </Button>
              </div>
            )}
            {selectedWithdrawal.status !== "pending" && (
              <Badge variant={selectedWithdrawal.status === "approved" ? "default" : "destructive"} className="w-full justify-center py-2 font-display">
                {selectedWithdrawal.status === "approved" ? "✅ Approved" : "❌ Rejected"}
              </Badge>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

// Stats Card Component
function StatsCard({ icon, label, value, color, pulse }: {
  icon: React.ReactNode; label: string; value: number; color: string; pulse?: boolean;
}) {
  return (
    <div className="gradient-card rounded-xl border border-border/50 p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={color}>{icon}</span>
        <span className="text-muted-foreground text-[10px] font-display">{label}</span>
        {pulse && value > 0 && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
      </div>
      <p className={`font-display text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
    </div>
  );
}

// Config Panel Component
function ConfigPanel({ energyPacks, conversions, setEnergyPacks, setConversions, adsgramBlockId, setAdsgramBlockId, onSave, loading }: {
  energyPacks: EnergyPack[];
  conversions: ConversionOption[];
  setEnergyPacks: (v: EnergyPack[]) => void;
  setConversions: (v: ConversionOption[]) => void;
  adsgramBlockId: number;
  setAdsgramBlockId: (v: number) => void;
  onSave: (key: string, value: any) => Promise<void>;
  loading: boolean;
}) {
  const [saving, setSaving] = useState(false);

  const updatePack = (index: number, field: keyof EnergyPack, value: string | number) => {
    const updated = [...energyPacks];
    (updated[index] as any)[field] = value;
    setEnergyPacks(updated);
  };

  const addPack = () => setEnergyPacks([...energyPacks, { energy: 0, priceUSD: "$0", priceMMK: "0 KS" }]);
  const removePack = (i: number) => setEnergyPacks(energyPacks.filter((_, idx) => idx !== i));

  const updateConversion = (index: number, field: keyof ConversionOption, value: number) => {
    const updated = [...conversions];
    updated[index][field] = value;
    setConversions(updated);
  };

  const addConversion = () => setConversions([...conversions, { energy: 0, pointsCost: 0 }]);
  const removeConversion = (i: number) => setConversions(conversions.filter((_, idx) => idx !== i));

  const handleSaveAll = async () => {
    setSaving(true);
    await onSave("energy_packs", energyPacks);
    await onSave("point_conversions", conversions);
    await onSave("adsgram_block_id", String(adsgramBlockId));
    setSaving(false);
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground text-sm font-display">Loading config...</div>;

  return (
    <ScrollArea className="h-[calc(100vh-420px)]">
      <div className="space-y-6">
        {/* Energy Packs */}
        <div className="gradient-card rounded-xl border border-border/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Energy Packs (USD / MMK)
            </h3>
            <Button variant="outline" size="sm" onClick={addPack} className="text-xs">
              <Plus className="w-3 h-3" /> Add
            </Button>
          </div>
          <div className="space-y-3">
            {energyPacks.map((pack, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 items-end">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Energy</Label>
                  <Input type="number" value={pack.energy} onChange={(e) => updatePack(i, "energy", Number(e.target.value))}
                    className="bg-muted/50 border-border/50 text-xs h-8" />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">USD</Label>
                  <Input value={pack.priceUSD} onChange={(e) => updatePack(i, "priceUSD", e.target.value)}
                    className="bg-muted/50 border-border/50 text-xs h-8" />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">MMK</Label>
                  <Input value={pack.priceMMK} onChange={(e) => updatePack(i, "priceMMK", e.target.value)}
                    className="bg-muted/50 border-border/50 text-xs h-8" />
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-destructive" onClick={() => removePack(i)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Point Conversions */}
        <div className="gradient-card rounded-xl border border-border/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-accent" /> Points to Energy
            </h3>
            <Button variant="outline" size="sm" onClick={addConversion} className="text-xs">
              <Plus className="w-3 h-3" /> Add
            </Button>
          </div>
          <div className="space-y-3">
            {conversions.map((conv, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 items-end">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Energy</Label>
                  <Input type="number" value={conv.energy} onChange={(e) => updateConversion(i, "energy", Number(e.target.value))}
                    className="bg-muted/50 border-border/50 text-xs h-8" />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Points Cost</Label>
                  <Input type="number" value={conv.pointsCost} onChange={(e) => updateConversion(i, "pointsCost", Number(e.target.value))}
                    className="bg-muted/50 border-border/50 text-xs h-8" />
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-destructive" onClick={() => removeConversion(i)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* AdsGram Block ID */}
        <div className="gradient-card rounded-xl border border-border/50 p-4">
          <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4 text-primary" /> AdsGram Block ID
          </h3>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label className="text-[10px] text-muted-foreground">Block ID (numeric)</Label>
              <Input type="number" value={adsgramBlockId} onChange={(e) => setAdsgramBlockId(Number(e.target.value))}
                className="bg-muted/50 border-border/50 text-xs h-8" />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button className="w-full gradient-primary text-primary-foreground font-display" onClick={handleSaveAll} disabled={saving}>
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save All Config"}
        </Button>
      </div>
    </ScrollArea>
  );
}


function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-xs font-display">{label}</span>
      <span className="text-foreground text-sm font-display font-bold break-all text-right max-w-[60%]">{value}</span>
    </div>
  );
}

export default Admin;
