// Audio sound synthesizer, vibration and system push notification helper for Auto Parts India

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a clear, pleasant two-tone notification sound chime using Web Audio API.
 */
export function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Tone 1: High crisp D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    
    gain1.gain.setValueAtTime(0.01, now);
    gain1.gain.exponentialRampToValueAtTime(0.25, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.25);

    // Tone 2: Warm Bright A5 (880.00 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880.00, now + 0.12);

    gain2.gain.setValueAtTime(0.01, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.3, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch (err) {
    console.warn("Audio Context sound play failed:", err);
  }
}

/**
 * Triggers haptic vibration for new messages on supported mobile browsers.
 */
export function triggerVibration(pattern: number[] = [150, 60, 150]) {
  if (typeof window !== "undefined" && "navigator" in window && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Haptics fail silently if unsupported or blocked
    }
  }
}

/**
 * Request permission for System Push Notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") {
    return "granted";
  }
  if (Notification.permission !== "denied") {
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.warn("Error requesting notification permission:", e);
    }
  }
  return Notification.permission;
}

interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
}

/**
 * Sends a native system notification even if app tab is in background.
 */
export function showPushNotification({ title, body, icon, tag, onClick }: PushNotificationOptions) {
  // Play sound & vibrate
  playNotificationSound();
  triggerVibration([150, 60, 150]);

  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission === "granted") {
    try {
      const defaultIcon = icon || "/favicon.ico";
      const notif = new Notification(title, {
        body,
        icon: defaultIcon,
        tag: tag || "autoparts_msg",
        renotify: true,
        badge: defaultIcon,
        silent: false,
      } as NotificationOptions);

      notif.onclick = (event) => {
        event.preventDefault();
        window.focus();
        if (onClick) {
          onClick();
        }
        notif.close();
      };
    } catch (err) {
      console.warn("Failed to create system notification:", err);
    }
  }
}
