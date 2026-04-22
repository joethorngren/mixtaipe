import { test, expect, Page } from "@playwright/test";
import { execSync } from "node:child_process";

// ============================================================================
// mixtAIpe E2E suite.
//
// Philosophy: cover the demo path + the JSON contracts the demo depends on.
// Don't try to be exhaustive — be re-runnable and deterministic where it
// matters.
//
// What this does NOT cover:
//   - Real Google Lyria / Gemini responses (tests tolerate both real and
//     fallback — they check shape, not specific content).
//   - Audio playback correctness (timing/codec stuff is out of scope).
//   - The late-99-IRC voice by ear (see K1/K2/K3 acceptance checklist).
// ============================================================================

const FEED_TABLE = "table";
const FEED_ROW = `${FEED_TABLE} tbody tr`;
const CHIP_SUFFIX_RE = /\d+°\s*$/;
const SCORE_FIELDS = [
  "pixelCrunch",
  "dialupWarmth",
  "burnedCdAuthenticity",
  "mixtapeCohesion",
  "overall",
] as const;

// ---------------------------------------------------------------------------
// HTTP smoke
// ---------------------------------------------------------------------------

test.describe("HTTP", () => {
  test("GET / → 200", async ({ request }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);
  });

  test("GET /live → 200", async ({ request }) => {
    const res = await request.get("/live");
    expect(res.status()).toBe(200);
  });

  test("GET /winamp/miniplayer-bg.png → 200", async ({ request }) => {
    const res = await request.get("/winamp/miniplayer-bg.png");
    expect(res.status()).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Page shell — chrome, seed box, Beanamp must all be present
// ---------------------------------------------------------------------------

test.describe("Page shell", () => {
  test("has the mixtAIpe title and Napster window chrome", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/mixtAIpe/i);
    await expect(page.getByText("mixtAIpe.exe")).toBeVisible();
  });

  test("SeedBox input is present and accepts text", async ({ page }) => {
    await page.goto("/");
    // SeedBox renders a bare <input> (no type attribute — defaults to text).
    // Prefer role over a CSS attribute selector so we're not coupled to
    // whether Pedro ever sets type="text" explicitly.
    const input = page.getByRole("textbox").first();
    await expect(input).toBeVisible();
    await input.fill("e2e test typing");
    await expect(input).toHaveValue("e2e test typing");
  });

  test("Beanamp mini-player is mounted", async ({ page }) => {
    await page.goto("/");
    // Beanamp renders the literal text "BEANAMP" in its title bar.
    await expect(page.getByText(/beanamp/i).first()).toBeVisible();
  });

  test("no unhandled console errors on fresh load", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    // Let any async boot code settle.
    await page.waitForLoadState("networkidle");
    expect(errors, errors.join("\n")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Trending chips — seeded, rendered, and hot→cold ordered
// ---------------------------------------------------------------------------

test.describe("Trending chips", () => {
  test("renders at least one chip and sorts hot→cold", async ({ page }) => {
    await seedTopicsIfMissing(page);
    await page.goto("/");
    // Chips come from a reactive Convex query. Wait for at least one to
    // render rather than snapshot-reading the DOM before hydration.
    await expect(
      page.locator("button").filter({ hasText: CHIP_SUFFIX_RE }).first(),
    ).toBeVisible({ timeout: 15_000 });

    const chips = await getChipHeats(page);
    expect(chips.length).toBeGreaterThan(0);
    for (let i = 1; i < chips.length; i++) {
      expect(chips[i]).toBeLessThanOrEqual(chips[i - 1]);
    }
  });
});

// ---------------------------------------------------------------------------
// Sidebar nav — only Library / Hot List / Search are kept. Others were
// removed because they pointed at duplicate or nonexistent anchors. These
// tests lock in both the positive (what should be there) and the negative
// (what should NOT be there) so nobody accidentally re-adds a broken link.
// ---------------------------------------------------------------------------

test.describe("Sidebar", () => {
  const KEPT: Array<{ label: string; hash: string; anchorSelector: string }> = [
    { label: "Library", hash: "#library", anchorSelector: "#library" },
    { label: "Hot List", hash: "#hot-list", anchorSelector: "#hot-list" },
    { label: "Search", hash: "#upload", anchorSelector: "#upload" },
  ];
  const REMOVED = ["Buddies", "Charts", "Chat Rooms", "Upload"];

  test("renders exactly the 3 kept entries (Library, Hot List, Search)", async ({ page }) => {
    await page.goto("/");
    for (const { label } of KEPT) {
      await expect(
        page.getByRole("link", { name: new RegExp(label, "i") }),
      ).toBeVisible();
    }
    for (const label of REMOVED) {
      // getByRole scoped to the sidebar aside — some removed labels (like
      // "Upload") happen to also appear as button text elsewhere on the
      // page. Only the sidebar occurrences should be gone.
      const sidebar = page.locator("aside").first();
      await expect(sidebar.getByRole("link", { name: new RegExp(`^${label}$`, "i") })).toHaveCount(0);
    }
  });

  for (const { label, hash, anchorSelector } of [
    { label: "Library", hash: "#library", anchorSelector: "#library" },
    { label: "Hot List", hash: "#hot-list", anchorSelector: "#hot-list" },
    { label: "Search", hash: "#upload", anchorSelector: "#upload" },
  ]) {
    test(`"${label}" link navigates to ${hash} and the anchor target exists`, async ({ page }) => {
      await page.goto("/");
      // Target must exist before we click, otherwise the hash jump is a no-op.
      await expect(page.locator(anchorSelector)).toBeAttached();

      await page.getByRole("link", { name: new RegExp(label, "i") }).click();
      await expect(page).toHaveURL(new RegExp(`${hash.replace("#", "\\#")}$`));
    });
  }
});

// ---------------------------------------------------------------------------
// The demo loop: click a chip → new feed row → audio + critique attach
// ---------------------------------------------------------------------------

test.describe("Demo loop", () => {
  test("clicking a chip adds a new feed row with author + title + critique", async ({ page }) => {
    await seedTopicsIfMissing(page);
    await page.goto("/");

    const rowCountBefore = await page.locator(FEED_ROW).count();

    // Pick the first non-hero chip so we don't collide with any pre-seeded
    // tamagotchi_funeral work. The button text contains "#<topic> NN°".
    const chip = page
      .locator("button")
      .filter({ hasText: CHIP_SUFFIX_RE })
      .nth(1);
    const chipLabel = (await chip.textContent()) ?? "";
    const chipTopic = chipLabel.match(/#(\S+)/)?.[1] ?? "";
    expect(chipTopic, "expected chip label to contain a #topic").not.toBe("");
    await chip.click();

    // Wait for row count to grow. Playwright retries inside the expect timeout.
    await expect
      .poll(() => page.locator(FEED_ROW).count(), { timeout: 20_000 })
      .toBeGreaterThan(rowCountBefore);

    // Scope to rows whose text contains our topic slug. Newest-first, so the
    // row we just created is on top of that filtered set. This avoids the
    // race where an unrelated prior row sits above our new row between
    // reactive updates.
    const ourRow = page
      .locator(FEED_ROW)
      .filter({ hasText: new RegExp(chipTopic, "i") })
      .first();
    await expect(ourRow).toBeVisible({ timeout: 10_000 });

    // Author handle (one of the 5 personas).
    await expect(ourRow).toContainText(
      /DJ_ShadowCore|xX_BassDaddy_Xx|ModemGhost99|NapsterPriestess|DialUpDeacon/i,
    );
    // File-style title with .mp3 extension.
    await expect(ourRow).toContainText(/\.mp3/i);

    // Critic attaches — verdict line starts with the critic handle.
    await expect(ourRow).toContainText(/DJ_A&R_98|A&R/i, { timeout: 20_000 });
  });
});

// ---------------------------------------------------------------------------
// Convex pipeline contract — JSON shape that the critic prompt + coerceCritique
// depend on. If this breaks, Gemini JSON output will fail to parse in prod.
// ---------------------------------------------------------------------------

test.describe("Convex pipeline (integration)", () => {
  test("tracks:listFeed returns rows with expected shape", () => {
    const rows = convexRun<FeedRow[]>("tracks:listFeed", { limit: 5 });
    expect(Array.isArray(rows)).toBe(true);
    if (rows.length > 0) assertRowShape(rows[0]);
  });

  test("seeds:seedFromTopic → track with attached critique whose scores clamp to [0,10]", () => {
    const topic = `e2e-suite-${Date.now()}`;
    convexRun("seeds:seedFromTopic", { topic });

    // listFeed returns newest-first, so the row we just created should be
    // near the top. Fetch enough to be safe.
    const rows = convexRun<FeedRow[]>("tracks:listFeed", { limit: 10 });
    const ours = rows.find((r) => r.topic === topic);
    expect(ours, `expected a row with topic=${topic} in the feed`).toBeDefined();
    if (!ours) return;

    assertRowShape(ours);
    expect(ours.critiques.length).toBeGreaterThan(0);
    const c = ours.critiques[0];
    expect(typeof c.verdict).toBe("string");
    expect(c.verdict.length).toBeGreaterThan(0);
    expect(c.criticAgent).toBe("DJ_A&R_98");
    for (const f of SCORE_FIELDS) {
      const v = c.scores[f];
      expect(Number.isInteger(v), `${f} must be integer`).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(10);
    }
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Critique = {
  verdict: string;
  criticAgent: string;
  scores: Record<(typeof SCORE_FIELDS)[number], number>;
};

type FeedRow = {
  _id: string;
  authorAgent: string;
  title: string;
  prompt: string;
  topic?: string;
  audioUrl: string | null;
  critiques: Critique[];
};

/**
 * Read chip heat values from the DOM. Hero chip has a 🔥 prefix from the
 * top-of-list styling, so we match by the "NN°" suffix rather than "#".
 */
async function getChipHeats(page: Page): Promise<number[]> {
  const chips = await page
    .locator("button")
    .filter({ hasText: CHIP_SUFFIX_RE })
    .allTextContents();
  return chips
    .map((t) => Number(t.match(/(\d+)°\s*$/)?.[1] ?? NaN))
    .filter((n) => Number.isFinite(n));
}

/**
 * Seed the topic list only if it looks empty. Idempotent. Keeps test runs
 * from double-seeding the same rows on every invocation.
 */
async function seedTopicsIfMissing(page: Page) {
  await page.goto("/");
  const count = (await getChipHeats(page)).length;
  if (count === 0) {
    execSync("pnpm seed:topics", { stdio: "inherit" });
    // Let the reactive query flush.
    await page.waitForTimeout(500);
  }
}

/**
 * Thin wrapper around `npx convex run` that parses JSON stdout. Convex prints
 * a leading "Running function" banner on stderr we don't care about.
 */
function convexRun<T>(name: string, args: Record<string, unknown> = {}): T {
  const argStr = JSON.stringify(args);
  const raw = execSync(`npx convex run ${name} '${argStr}'`, {
    stdio: ["ignore", "pipe", "ignore"],
    encoding: "utf-8",
  }).trim();

  // Some mutations return void — stdout is empty, or literally "null".
  // Callers that don't care about the return value pass T = null/unknown.
  if (raw === "" || raw === "null") {
    return null as unknown as T;
  }

  // Convex sometimes prefixes with log lines before the JSON body.
  const candidates = ["{", "["]
    .map((c) => raw.indexOf(c))
    .filter((i) => i !== -1);
  const firstBrace = candidates.length > 0 ? Math.min(...candidates) : -1;
  const body = firstBrace >= 0 ? raw.slice(firstBrace) : raw;
  return JSON.parse(body) as T;
}

function assertRowShape(row: FeedRow) {
  expect(typeof row._id).toBe("string");
  expect(typeof row.authorAgent).toBe("string");
  expect(typeof row.title).toBe("string");
  expect(typeof row.prompt).toBe("string");
  // audioUrl is nullable while audio is still generating.
  expect(row.audioUrl === null || typeof row.audioUrl === "string").toBe(true);
  expect(Array.isArray(row.critiques)).toBe(true);
}
