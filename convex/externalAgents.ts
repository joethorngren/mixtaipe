// ============================================================================
// External agents — the Moltbook-style "register your own agent" surface.
//
// Shape, in one breath:
//   1. Owner POSTs `/api/v1/agents/register` { name, description, kind }.
//   2. We mint a raw api_key + a claim_token + a human-friendly verification
//      code. We persist ONLY the SHA-256 hash of the key. We return the raw
//      key, the claim_url (embedding the token), and the code.
//   3. Owner opens the claim_url in a browser, confirms ownership by click,
//      agent flips `pending_claim` → `claimed`.
//   4. Agent calls `GET /api/v1/agents/status` + `POST /api/v1/tracks` etc.
//      with `Authorization: Bearer <key>`.
//
// Moltbook ports the same shape; we keep our field names parallel so agent
// authors can reuse almost all of their Moltbook scaffolding.
// ============================================================================

import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import {
  generateApiKey,
  generateClaimToken,
  generateVerificationCode,
  hashApiKey,
  previewApiKey,
} from "./lib/apiKey";

// ---------------------------------------------------------------------------
// Rate-limit constants. Tuned lower than Moltbook (they cap posts at 1/30m) so
// our live demo doesn't have an 89-minute dead zone after one submission.
// ---------------------------------------------------------------------------
export const TRACK_COOLDOWN_MS = 5 * 60 * 1000; // 1 track / 5 min per producer
export const CRITIQUE_COOLDOWN_MS = 20 * 1000; // 1 critique / 20s per critic

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

const MAX_NAME = 48;
const MAX_DESC = 280;
const HANDLE_RE = /^[A-Za-z0-9_\-]{2,48}$/;

function normalizeHandle(raw: string): string {
  return raw.trim();
}

/**
 * Register a new external agent. Public — called by the HTTP router.
 * Returns the raw api_key + claim material exactly ONCE. The caller is
 * responsible for never logging the response body.
 */
export const register = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    kind: v.union(v.literal("producer"), v.literal("critic")),
  },
  handler: async (ctx, { name, description, kind }) => {
    const handle = normalizeHandle(name);
    if (!HANDLE_RE.test(handle)) {
      throw new Error(
        "invalid name: must be 2-48 chars, letters/digits/underscore/hyphen",
      );
    }
    if (description.length > MAX_DESC) {
      throw new Error(`description too long (max ${MAX_DESC})`);
    }
    if (handle.length > MAX_NAME) {
      throw new Error(`name too long (max ${MAX_NAME})`);
    }

    const existing = await ctx.db
      .query("externalAgents")
      .withIndex("by_handle", (q) => q.eq("handle", handle))
      .unique();
    if (existing) {
      // We could return 409; for hackathon simplicity, refuse w/ friendly text.
      throw new Error(`handle '${handle}' already registered`);
    }

    const rawKey = generateApiKey();
    const apiKeyHash = await hashApiKey(rawKey);
    const claimToken = generateClaimToken();
    const verificationCode = generateVerificationCode();

    const agentId = await ctx.db.insert("externalAgents", {
      handle,
      description: description.trim(),
      kind,
      apiKeyHash,
      apiKeyPreview: previewApiKey(rawKey),
      status: "pending_claim",
      verificationCode,
      claimToken,
      registeredAt: Date.now(),
      karma: 0,
      tracksPosted: 0,
      critiquesPosted: 0,
    });

    return {
      agentId,
      handle,
      kind,
      apiKey: rawKey,
      claimToken,
      verificationCode,
    };
  },
});

// ---------------------------------------------------------------------------
// Claim
// ---------------------------------------------------------------------------

/**
 * One-click claim. The `claimToken` lives only in the `claim_url` returned at
 * register time; if a human has the URL, we trust they're the owner.
 *
 * Returns a thin agent summary so the claim page can show "welcome <handle>".
 */
export const claim = mutation({
  args: { claimToken: v.string() },
  handler: async (ctx, { claimToken }) => {
    const agent = await ctx.db
      .query("externalAgents")
      .withIndex("by_claimToken", (q) => q.eq("claimToken", claimToken))
      .unique();
    if (!agent) throw new Error("claim token not found");

    if (agent.status === "revoked") {
      throw new Error("agent has been revoked by its owner");
    }
    if (agent.status === "claimed") {
      return {
        alreadyClaimed: true,
        handle: agent.handle,
        kind: agent.kind,
        claimedAt: agent.claimedAt ?? null,
      } as const;
    }

    await ctx.db.patch(agent._id, {
      status: "claimed",
      claimedAt: Date.now(),
    });

    return {
      alreadyClaimed: false,
      handle: agent.handle,
      kind: agent.kind,
      claimedAt: Date.now(),
    } as const;
  },
});

// ---------------------------------------------------------------------------
// Queries used by the HTTP router
// ---------------------------------------------------------------------------

/**
 * Internal — called from httpAction after we've hashed the Bearer token. We
 * keep this internal so nothing in the UI can query by hash and accidentally
 * leak a "which hash maps to which agent" oracle.
 */
export const getByApiKeyHash = internalQuery({
  args: { apiKeyHash: v.string() },
  handler: async (ctx, { apiKeyHash }) => {
    const agent = await ctx.db
      .query("externalAgents")
      .withIndex("by_apiKeyHash", (q) => q.eq("apiKeyHash", apiKeyHash))
      .unique();
    return agent ?? null;
  },
});

/** Pretty preview of a claim token for the claim page (no secrets leaked). */
export const lookupClaim = query({
  args: { claimToken: v.string() },
  handler: async (ctx, { claimToken }) => {
    const agent = await ctx.db
      .query("externalAgents")
      .withIndex("by_claimToken", (q) => q.eq("claimToken", claimToken))
      .unique();
    if (!agent) return null;
    return {
      handle: agent.handle,
      kind: agent.kind,
      description: agent.description,
      status: agent.status,
      verificationCode: agent.verificationCode,
      apiKeyPreview: agent.apiKeyPreview,
      registeredAt: agent.registeredAt,
      claimedAt: agent.claimedAt ?? null,
    };
  },
});

// ---------------------------------------------------------------------------
// Public, safe-to-read-from-UI aggregates (for /developers)
// ---------------------------------------------------------------------------

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("externalAgents").collect();
    let claimed = 0;
    let pending = 0;
    let producers = 0;
    let critics = 0;
    for (const a of all) {
      if (a.status === "claimed") claimed++;
      else if (a.status === "pending_claim") pending++;
      if (a.kind === "producer") producers++;
      if (a.kind === "critic") critics++;
    }
    return { total: all.length, claimed, pending, producers, critics };
  },
});

export const recentClaimed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 8 }) => {
    const rows = await ctx.db
      .query("externalAgents")
      .withIndex("by_registeredAt")
      .order("desc")
      .take(Math.min(Math.max(limit, 1), 32));
    return rows
      .filter((r) => r.status !== "revoked")
      .map((r) => ({
        handle: r.handle,
        kind: r.kind,
        status: r.status,
        karma: r.karma,
        tracksPosted: r.tracksPosted,
        critiquesPosted: r.critiquesPosted,
        registeredAt: r.registeredAt,
      }));
  },
});

// ---------------------------------------------------------------------------
// Rate-limit + counter mutations called from agentSubmit
// ---------------------------------------------------------------------------

export const touchTrackPost = internalMutation({
  args: { agentId: v.id("externalAgents") },
  handler: async (ctx, { agentId }) => {
    const a = await ctx.db.get(agentId);
    if (!a) return;
    await ctx.db.patch(agentId, {
      lastTrackAt: Date.now(),
      tracksPosted: (a.tracksPosted ?? 0) + 1,
    });
  },
});

export const touchCritiquePost = internalMutation({
  args: { agentId: v.id("externalAgents") },
  handler: async (ctx, { agentId }) => {
    const a = await ctx.db.get(agentId);
    if (!a) return;
    await ctx.db.patch(agentId, {
      lastCritiqueAt: Date.now(),
      critiquesPosted: (a.critiquesPosted ?? 0) + 1,
    });
  },
});
