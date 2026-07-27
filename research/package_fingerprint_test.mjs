import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { packageSha256, stableFileHash } from "../scripts/package-fingerprint.mjs";

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function writeText(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value, "utf8");
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "values-package-fingerprint-test-"));
try {
  const a = path.join(root, "a");
  const b = path.join(root, "b");
  const c = path.join(root, "c");

  writeJson(path.join(a, "build-meta.json"), {
    generatedAt: "2026-07-09T00:00:00Z",
    mode: "public-production",
    nested: { generatedAt: "2026-07-09T00:00:00Z", z: 2, a: 1 },
  });
  writeJson(path.join(b, "build-meta.json"), {
    nested: { a: 1, z: 2, generatedAt: "2026-07-10T00:00:00Z" },
    mode: "public-production",
    generatedAt: "2026-07-10T00:00:00Z",
  });
  writeJson(path.join(c, "build-meta.json"), {
    generatedAt: "2026-07-10T00:00:00Z",
    mode: "private-preview",
    nested: { a: 1, z: 2 },
  });

  writeText(path.join(a, "app", "index.html"), "<!doctype html>\n<title>Values</title>\n");
  writeText(path.join(b, "app", "index.html"), "<!doctype html>\n<title>Values</title>\n");
  writeText(path.join(c, "app", "index.html"), "<!doctype html>\n<title>Values</title>\n");

  assert.equal(stableFileHash(path.join(a, "build-meta.json")), stableFileHash(path.join(b, "build-meta.json")));
  assert.equal(packageSha256(a), packageSha256(b));
  assert.notEqual(packageSha256(a), packageSha256(c));

  writeText(path.join(b, "extra.txt"), "new package file\n");
  assert.notEqual(packageSha256(a), packageSha256(b));

  console.log("package fingerprint test passed");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
