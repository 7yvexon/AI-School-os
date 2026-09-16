import "server-only";

import { parseRuntimeConfig } from "./env-core";

export { RuntimeConfigError, parseRuntimeConfig } from "./env-core";

export function getRuntimeConfig() {
  return parseRuntimeConfig(process.env);
}
