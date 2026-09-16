import { randomBytes } from "node:crypto";

export function createClassCode() {
  return `BSS-${randomBytes(5).toString("hex").toUpperCase()}`;
}
