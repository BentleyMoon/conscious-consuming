import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function normalizeJson(value) {
  if (Array.isArray(value)) return value.map(normalizeJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "generatedAt")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [key, normalizeJson(child)]),
  );
}

export function stableFileHash(file) {
  const hash = crypto.createHash("sha256");
  if (file.endsWith(".json")) {
    try {
      const normalized = normalizeJson(JSON.parse(fs.readFileSync(file, "utf8")));
      hash.update(JSON.stringify(normalized));
      return hash.digest("hex");
    } catch {
      // Fall through to byte hashing for malformed or non-UTF JSON-like files.
    }
  }
  hash.update(fs.readFileSync(file));
  return hash.digest("hex");
}

export function listPackageFiles(dir, base = dir) {
  const rows = [];
  for (const name of fs.readdirSync(dir).sort((a, b) => a.localeCompare(b))) {
    const file = path.join(dir, name);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) {
      rows.push(...listPackageFiles(file, base));
    } else if (stat.isFile()) {
      rows.push(path.relative(base, file).replace(/\\/g, "/"));
    }
  }
  return rows;
}

export function packageSha256(outDir) {
  const hash = crypto.createHash("sha256");
  for (const rel of listPackageFiles(outDir)) {
    hash.update(rel);
    hash.update("\0");
    hash.update(stableFileHash(path.join(outDir, rel)));
    hash.update("\n");
  }
  return hash.digest("hex");
}
