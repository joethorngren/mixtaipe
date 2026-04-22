/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agentSubmit from "../agentSubmit.js";
import type * as critique from "../critique.js";
import type * as externalAgents from "../externalAgents.js";
import type * as generate from "../generate.js";
import type * as http from "../http.js";
import type * as lib_apiKey from "../lib/apiKey.js";
import type * as seeds from "../seeds.js";
import type * as tracks from "../tracks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agentSubmit: typeof agentSubmit;
  critique: typeof critique;
  externalAgents: typeof externalAgents;
  generate: typeof generate;
  http: typeof http;
  "lib/apiKey": typeof lib_apiKey;
  seeds: typeof seeds;
  tracks: typeof tracks;
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
