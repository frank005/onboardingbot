/**
 * Client-side daily demo quota — no server database.
 * Tracks elapsed seconds per user per UTC calendar day in localStorage.
 */

const STORAGE_PREFIX = "agora_demo_usage_";

export function utcDateBucket(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getDailyQuotaSeconds() {
  const raw = process.env.REACT_APP_DEMO_QUOTA_SECONDS;
  const parsed = raw ? parseInt(raw, 10) : 900;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 900;
}

function bypassAccounts() {
  const raw = process.env.REACT_APP_QUOTA_BYPASS_ACCOUNTS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Unlimited demo time for @agora.io and *.agora.io mailboxes */
export function isAgoraDomainEmail(email) {
  const lower = (email || "").toLowerCase().trim();
  if (!lower.includes("@")) return false;
  const domain = lower.split("@").pop();
  return domain === "agora.io" || domain.endsWith(".agora.io");
}

export function isQuotaBypassed(user) {
  if (!user) return false;
  if (isAgoraDomainEmail(user.email)) return true;
  const allow = bypassAccounts();
  if (!allow.length) return false;
  const id = (user.id || "").toLowerCase();
  const email = (user.email || "").toLowerCase();
  return allow.includes(id) || allow.includes(email);
}

function storageKey(userId, bucket) {
  return `${STORAGE_PREFIX}${userId}_${bucket}`;
}

export function getUsedSeconds(userId, bucket = utcDateBucket()) {
  if (!userId) return 0;
  try {
    const raw = localStorage.getItem(storageKey(userId, bucket));
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export function setUsedSeconds(userId, seconds, bucket = utcDateBucket()) {
  if (!userId) return;
  try {
    localStorage.setItem(
      storageKey(userId, bucket),
      String(Math.max(0, Math.floor(seconds))),
    );
  } catch {
    // ignore quota persistence errors
  }
}

export function addUsedSeconds(userId, deltaSeconds, bucket = utcDateBucket()) {
  const next = getUsedSeconds(userId, bucket) + Math.max(0, deltaSeconds);
  setUsedSeconds(userId, next, bucket);
  return next;
}

export function getRemainingSeconds(user, bucket = utcDateBucket()) {
  if (!user?.id) return getDailyQuotaSeconds();
  if (isQuotaBypassed(user)) return Infinity;
  const quota = getDailyQuotaSeconds();
  return Math.max(0, quota - getUsedSeconds(user.id, bucket));
}

export function isQuotaExhausted(user, bucket = utcDateBucket()) {
  if (!user?.id || isQuotaBypassed(user)) return false;
  return getRemainingSeconds(user, bucket) <= 0;
}
