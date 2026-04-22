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
// Buttons — every clickable surface a judge will touch during the demo.
// Chip click is covered in "Demo loop" above. This block covers:
//   - SeedBox upload button (full submit flow, not just typing)
//   - Enter-to-submit on SeedBox (same flow, different input path)
//   - "Play in deck" row buttons (Beanamp deck source swap)
// ---------------------------------------------------------------------------

test.describe("Buttons", () => {
  test("SeedBox upload button submits the typed topic and produces a feed row", async ({ page }) => {
    await seedTopicsIfMissing(page);
    await page.goto("/");

    // Use a unique-per-run topic so repeat runs don't confuse the "our row"
    // filter below.
    const topic = `e2e-btn-${Date.now()}`;
    const input = page.getByRole("textbox").first();
    await input.fill(topic);

    const rowsBefore = await page.locator(FEED_ROW).count();

    // Button is labeled "upload" when idle, "sending…" while the action runs.
    // Match by accessible name; disabled transitions are auto-waited by
    // Playwright.
    const uploadBtn = page.getByRole("button", { name: /^upload$/i });
    await expect(uploadBtn).toBeEnabled();
    await uploadBtn.click();

    await expect
      .poll(() => page.locator(FEED_ROW).count(), { timeout: 20_000 })
      .toBeGreaterThan(rowsBefore);

    // The row we created should be locatable by our unique topic.
    const ourRow = page
      .locator(FEED_ROW)
      .filter({ hasText: new RegExp(topic.replace(/-/g, "[-_]"), "i") })
      .first();
    await expect(ourRow).toBeVisible({ timeout: 10_000 });
    await expect(ourRow).toContainText(/\.mp3/i);

    // The row appears before the full action returns; SeedBox clears only
    // after the generation action resolves, which can be slower when Lyria
    // endpoint probing falls back.
    await expect(uploadBtn).toBeEnabled({ timeout: 60_000 });
    await expect(input).toHaveValue("");
  });

  test("Enter key in SeedBox submits just like the upload button", async ({ page }) => {
    await seedTopicsIfMissing(page);
    await page.goto("/");

    const topic = `e2e-enter-${Date.now()}`;
    const input = page.getByRole("textbox").first();
    await input.fill(topic);

    const rowsBefore = await page.locator(FEED_ROW).count();
    await input.press("Enter");

    await expect
      .poll(() => page.locator(FEED_ROW).count(), { timeout: 20_000 })
      .toBeGreaterThan(rowsBefore);

    const ourRow = page
      .locator(FEED_ROW)
      .filter({ hasText: new RegExp(topic.replace(/-/g, "[-_]"), "i") })
      .first();
    await expect(ourRow).toBeVisible({ timeout: 10_000 });
  });

  test("empty submit is a no-op (no new row, no crash)", async ({ page }) => {
    await seedTopicsIfMissing(page);
    await page.goto("/");

    const input = page.getByRole("textbox").first();
    await input.fill("");

    // Stabilize first: a reactive-feed row from the previous test may still
    // be propagating. Wait until the row count hasn't changed for ~800ms,
    // then capture the baseline. This avoids a flake where the "no-op"
    // submit races with a late-landing row from a prior test.
    const rowsBefore = await stableRowCount(page);
    await input.press("Enter");

    // Give the action a second to NOT fire.
    await page.waitForTimeout(1_000);
    const rowsAfter = await page.locator(FEED_ROW).count();
    expect(rowsAfter).toBe(rowsBefore);
  });

  test("every feed row exposes a 'Play in deck' button, and clicking one loads that track", async ({ page }) => {
    // Make sure the feed has at least one row to play.
    await ensureAtLeastOneTrack(page);
    await page.goto("/");

    const rows = page.locator(FEED_ROW);
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Every row has its own play button.
    const playButtons = page.getByRole("button", { name: /play in deck/i });
    await expect
      .poll(() => playButtons.count(), { timeout: 5_000 })
      .toBeGreaterThanOrEqual(rowCount);

    // Snapshot current deck source, then click Play on a row and assert the
    // deck's <audio src> becomes the Convex storage URL for some track.
    // Beanamp is a single shared deck, so the one <audio> in the DOM is the
    // source of truth.
    const audio = page.locator("audio").first();
    await expect(audio).toBeAttached();
    const srcBefore = await audio.getAttribute("src").catch(() => null);

    await playButtons.first().click();

    // After click the deck should be pointed at a Convex storage URL. We
    // don't care which one (just that the button wired through to the deck).
    await expect
      .poll(async () => (await audio.getAttribute("src")) ?? "", {
        timeout: 10_000,
      })
      .toMatch(/\/api\/storage\//);

    // If there was a prior src, the new one is either the same (clicked the
    // already-loaded track) or different (source swapped). Either is legal
    // — the assertion above proves the button wired to the deck. We only
    // record a note when the row count is >1 and srcBefore existed but the
    // new click didn't change anything — that would suggest a silent bug.
    const srcAfter = await audio.getAttribute("src");
    if (srcBefore && rowCount > 1 && srcAfter === srcBefore) {
      // Click a different row to prove source-swap works end-to-end.
      await playButtons.nth(1).click();
      await expect
        .poll(async () => (await audio.getAttribute("src")) ?? "", {
          timeout: 10_000,
        })
        .not.toBe(srcBefore);
    }
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
 * Seed the topic list only if it's truly empty. Checks the Convex DB
 * directly rather than reading the DOM (the DOM may not have hydrated yet,
 * and `seeds:importTopics` throws on duplicates because it uses .unique()).
 * Swallows the importTopics error so a partially-seeded DB doesn't poison
 * the whole test run.
 */
async function seedTopicsIfMissing(page: Page) {
  const topics = convexRun<Array<unknown>>("seeds:listTrending", {});
  if (topics.length === 0) {
    try {
      execSync("pnpm seed:topics", { stdio: "pipe" });
    } catch (err) {
      // Expected when prior runs left partial data behind — seeds:importTopics
      // uses .unique() per topic and throws on duplicates. We only care that
      // at least one topic exists by the time the page renders.
      console.warn(
        "[e2e] seeds:importTopics threw (likely duplicate topics); continuing",
      );
    }
    // Let the reactive query flush.
    await page.waitForTimeout(500);
  }
}

/**
 * Poll the feed's row count until it hasn't changed for two consecutive
 * reads (~800ms apart). Returns the stable count. Used to defeat the race
 * where a prior test's reactive-feed write is still propagating.
 */
async function stableRowCount(page: Page, settleMs = 800, maxWaitMs = 5_000): Promise<number> {
  const start = Date.now();
  let prev = await page.locator(FEED_ROW).count();
  while (Date.now() - start < maxWaitMs) {
    await page.waitForTimeout(settleMs);
    const cur = await page.locator(FEED_ROW).count();
    if (cur === prev) return cur;
    prev = cur;
  }
  return prev;
}

/**
 * Make sure the feed has at least one row. If empty, seed one via the
 * Convex CLI so the Play-in-deck test always has something to click.
 */
async function ensureAtLeastOneTrack(page: Page) {
  const existing = convexRun<FeedRow[]>("tracks:listFeed", { limit: 1 });
  if (existing.length === 0) {
    convexRun("seeds:seedFromTopic", { topic: `e2e-bootstrap-${Date.now()}` });
    // Reactive query needs a tick to propagate to the browser.
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
