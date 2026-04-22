/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agents from "../agents.js";
import type * as audio from "../audio.js";
import type * as critique from "../critique.js";
import type * as crons from "../crons.js";
import type * as enrich from "../enrich.js";
import type * as generate from "../generate.js";
import type * as intake from "../intake.js";
import type * as reactions from "../reactions.js";
import type * as roomLog from "../roomLog.js";
import type * as seeds from "../seeds.js";
import type * as settings from "../settings.js";
import type * as signals from "../signals.js";
import type * as smalltalk from "../smalltalk.js";
import type * as tracks from "../tracks.js";
import type * as trends from "../trends.js";
import type * as upcomingEvents from "../upcomingEvents.js";
import type * as wire from "../wire.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agents: typeof agents;
  audio: typeof audio;
  critique: typeof critique;
  crons: typeof crons;
  enrich: typeof enrich;
  generate: typeof generate;
  intake: typeof intake;
  reactions: typeof reactions;
  roomLog: typeof roomLog;
  seeds: typeof seeds;
  settings: typeof settings;
  signals: typeof signals;
  smalltalk: typeof smalltalk;
  tracks: typeof tracks;
  trends: typeof trends;
  upcomingEvents: typeof upcomingEvents;
  wire: typeof wire;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
