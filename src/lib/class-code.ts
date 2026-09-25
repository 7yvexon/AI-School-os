import { randomBytes } from "node:crypto";

export function createClassCode() {
  return `BSS-${randomBytes(8).toString("hex").toUpperCase()}`;
}
