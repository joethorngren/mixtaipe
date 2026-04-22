// ============================================================================
// API-key primitives for the public `/api/v1` surface.
//
// Pattern lifted from Moltbook (see docs at /skill.md):
//   - raw key shape: `mxtp_sk_<32+ hex chars>` (returned once at register time)
//   - storage: SHA-256 hash only, never the raw key
//   - preview: last 4 chars of the raw key, safe to show in UI
//
// We stay in Convex's default (V8) runtime so every call-site — including the
// HTTP router — can import this without pulling "use node" in. That means we
// rely on WebCrypto (`globalThis.crypto.subtle`) for hashing and the built-in
// CSPRNG (`globalThis.crypto.getRandomValues`) for entropy.
// ============================================================================

const KEY_PREFIX = "mxtp_sk_";
const CLAIM_PREFIX = "mxtp_claim_";

/** Lowercase hex of `bytes`. */
function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    out += (b < 16 ? "0" : "") + b.toString(16);
  }
  return out;
}

function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  globalThis.crypto.getRandomValues(buf);
  return buf;
}

function randomHex(bytes: number): string {
  return bytesToHex(randomBytes(bytes));
}

/** `mxtp_sk_<64 hex chars>`. Returned once; never re-retrievable. */
export function generateApiKey(): string {
  return `${KEY_PREFIX}${randomHex(32)}`;
}

/** `mxtp_claim_<48 hex chars>`. Embedded in the claim URL. */
export function generateClaimToken(): string {
  return `${CLAIM_PREFIX}${randomHex(24)}`;
}

/**
 * Moltbook-style `reef-X4B2` verification code — memorable-ish short string
 * that the owner can eyeball on the claim page to double-check the URL didn't
 * get corrupted in transit.
 */
export function generateVerificationCode(): string {
  const adjectives = [
    "reef", "neon", "pixel", "dial", "burn", "chrome", "tape", "glitch",
    "lime", "molt", "webring", "crt", "limewire", "rave", "cdr", "gif",
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O to dodge transcription errors
  const digits = "0123456789";
  let tail = "";
  const entropy = randomBytes(4);
  tail += letters[entropy[0] % letters.length];
  tail += digits[entropy[1] % 10];
  tail += letters[entropy[2] % letters.length];
  tail += digits[entropy[3] % 10];
  return `${adj}-${tail}`;
}

/** Safe-to-display preview: `mxtp_sk_…a1b2`. */
export function previewApiKey(rawKey: string): string {
  if (!rawKey.startsWith(KEY_PREFIX)) return `${rawKey.slice(0, 6)}…`;
  return `${KEY_PREFIX}…${rawKey.slice(-4)}`;
}

/** SHA-256 hex digest of the raw key. */
export async function hashApiKey(rawKey: string): Promise<string> {
  const data = new TextEncoder().encode(rawKey);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

/** Lenient extraction of a Bearer token from an HTTP Authorization header. */
export function parseBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const m = /^\s*Bearer\s+(\S+)\s*$/i.exec(header);
  return m ? m[1] : null;
}

export const API_KEY_PREFIX = KEY_PREFIX;
export const CLAIM_TOKEN_PREFIX = CLAIM_PREFIX;
