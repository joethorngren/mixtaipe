import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "refresh Google Trends battles",
  { hours: 6 },
  api.trends.refreshGoogleTrends,
  { geo: "US", limit: 10 },
);

export default crons;
