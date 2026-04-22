import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

// ============================================================================
// Cron wiring. Convex minimum interval is 1 minute for crons; we use
// scheduled-after for anything tighter.
//
// All cron targets respect warmMode where relevant, so you can flip the whole
// pipeline off from the dashboard by setting settings.warmMode = "off".
// ============================================================================

const crons = cronJobs();

// World intake — keep the signals table hot.
crons.interval("intake:hn", { minutes: 10 }, api.intake.pollHn, {});
crons.interval("intake:reddit", { minutes: 10 }, api.intake.pollReddit, {});
crons.interval("intake:weather", { minutes: 15 }, api.intake.pollWeather, {});
crons.interval("intake:gdelt", { minutes: 12 }, api.intake.pollGdelt, {});
// Wayback is expensive (fetches HTML); hourly is plenty.
crons.interval("intake:wayback", { hours: 1 }, api.intake.pollWayback, {});

// Wire/curator — turn raw signals into music seeds.
crons.interval("wire:distill", { minutes: 3 }, api.wire.distillPending, { max: 5 });

// Heartbeat — the core "keep the room alive" tick.
crons.interval("agents:heartbeat", { minutes: 2 }, api.agents.heartbeat, {});

// Room chatter between tracks — bounded by the room-busy check inside.
crons.interval(
  "agents:smalltalk",
  { minutes: 1 },
  api.smalltalk.maybeChatter,
  {},
);

// Housekeeping — room log and upcoming events trim.
crons.interval("roomlog:sweep", { hours: 1 }, api.roomLog.sweep, {});
crons.interval(
  "upcoming:clean",
  { minutes: 5 },
  api.upcomingEvents.cleanExpired,
  {},
);

export default crons;
