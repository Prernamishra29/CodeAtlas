import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { jwtSecret } from "../common/env";

function key() {
  return createHash("sha256").update(jwtSecret()).digest();
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(payload: string) {
  const buffer = Buffer.from(payload, "base64");
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function githubCloneUrl(publicUrl: string, token: string) {
  const clean = publicUrl.replace(/\.git$/i, "").replace(/\/$/, "");
  const match = clean.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/i);
  if (!match) return publicUrl;
  return `https://x-access-token:${encodeURIComponent(token)}@github.com/${match[1]}/${match[2]}.git`;
}
