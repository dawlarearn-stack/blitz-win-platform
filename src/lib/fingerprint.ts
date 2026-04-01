// Simple browser fingerprint generator for anti-cheat
export function generateFingerprint(): string {
  const components: string[] = [];

  // Screen
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Language
  components.push(navigator.language);

  // Platform
  components.push(navigator.platform);

  // Hardware concurrency
  components.push(String(navigator.hardwareConcurrency || 0));

  // Device memory (if available)
  components.push(String((navigator as any).deviceMemory || 0));

  // Canvas fingerprint
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("PGR-fp", 2, 15);
      components.push(canvas.toDataURL().slice(-50));
    }
  } catch {}

  // WebGL renderer
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl");
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      if (ext) {
        components.push(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
      }
    }
  } catch {}

  // Simple hash
  const raw = components.join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return "fp-" + Math.abs(hash).toString(36);
}

// Get Telegram user info
export function getTelegramUser(): { id: string; username: string | null; firstName: string | null } {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user) {
      const u = tg.initDataUnsafe.user;
      return {
        id: String(u.id),
        username: u.username || null,
        firstName: u.first_name || null,
      };
    }
  } catch {}
  return { id: getTelegramId(), username: null, firstName: null };
}

// Get telegram ID from Telegram WebApp
export function getTelegramId(): string {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.id) {
      return String(tg.initDataUnsafe.user.id);
    }
  } catch {}

  // Fallback: use stored ID or generate one for dev
  const STORAGE_KEY = "pgr_telegram_id";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = "dev-" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
