import { spawnSync } from "node:child_process";

export const GROUPS = [
  ["generated", "Generated app outputs"],
  ["content", "Content source"],
  ["app", "App/product code"],
  ["public", "Public route surfaces"],
  ["docs", "Docs and operating notes"],
  ["tooling", "Build/audit/deploy tooling"],
  ["other", "Other"],
];

const GENERATED_FILES = new Set([
  "app/data.js",
  "app/guides.js",
  "app/og-home.png",
  "app/sitemap.xml",
  "app/robots.txt",
  "app/index.html",
]);
const GENERATED_PREFIXES = [
  "app/data/",
  "app/g/",
  "app/c/",
];
const PUBLIC_PREFIXES = [
  "assembly/",
  "contribute/",
  "funders/",
  "instances/",
  "kosplora/",
  "passport/",
  "slate/",
  "standard/",
  "tour/",
  "weave/",
  "workshop/",
];
const TOOLING_PREFIXES = [
  ".github/",
  "pipeline/",
  "research/",
  "scripts/",
];
const TOOLING_FILES = new Set([
  "package.json",
  "package-lock.json",
  "wrangler.toml",
]);
const DOC_FILES = new Set([
  "README.md",
  "AGENTS.md",
]);

export function normalizePath(value) {
  return value.replace(/\\/g, "/").replace(/^"|"$/g, "");
}

export function statusEntries(cwd = process.cwd()) {
  const result = spawnSync("git", ["status", "--short", "--untracked-files=all"], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) {
    throw new Error(`Failed to run git status: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "git status failed");
  }
  return result.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => {
      const code = line.slice(0, 2);
      const raw = line.slice(3).trim();
      const file = normalizePath(raw.includes(" -> ") ? raw.split(" -> ").pop() : raw);
      return { code, file };
    });
}

function startsWithAny(file, prefixes) {
  return prefixes.some(prefix => file.startsWith(prefix));
}

export function classify(file) {
  if (GENERATED_FILES.has(file) || startsWithAny(file, GENERATED_PREFIXES)) return "generated";
  if (file.startsWith("content/")) return "content";
  if (file.startsWith("app/")) return "app";
  if (file.startsWith("docs/") || DOC_FILES.has(file)) return "docs";
  if (TOOLING_FILES.has(file) || startsWithAny(file, TOOLING_PREFIXES)) return "tooling";
  if (file === "index.html" || startsWithAny(file, PUBLIC_PREFIXES)) return "public";
  return "other";
}

export function codeLabel(code) {
  if (code === "??") return "untracked";
  if (code.includes("D")) return "deleted";
  if (code.includes("R")) return "renamed";
  if (code.includes("A")) return "added";
  if (code.includes("M")) return "modified";
  return code.trim() || "changed";
}

export function summarize(entries) {
  const groups = new Map(GROUPS.map(([id, label]) => [id, { id, label, entries: [] }]));
  for (const entry of entries) groups.get(classify(entry.file)).entries.push(entry);
  return [...groups.values()];
}

export function stateCounts(entries) {
  const counts = new Map();
  for (const entry of entries) {
    const label = codeLabel(entry.code);
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return counts;
}

export function countText(entries) {
  const counts = stateCounts(entries);
  return [...counts.entries()].map(([label, count]) => `${label} ${count}`).join(", ");
}

export function gateSuggestions(groups) {
  const has = id => groups.find(group => group.id === id)?.entries.length > 0;
  const suggestions = [];
  if (has("content") || has("generated")) {
    suggestions.push(["npm run audit:generated", "content or generated app outputs changed"]);
    suggestions.push(["npm run verify", "generated invariants and local links"]);
  }
  if (has("app") || has("public")) {
    suggestions.push(["npm run audit:first-use", "product route or app surface changed"]);
  }
  if (has("tooling") || has("docs")) {
    suggestions.push(["npm run audit:commands", "commands, tooling, or operating docs changed"]);
  }
  if (has("tooling") || has("public")) {
    suggestions.push(["npm run health:deploy", "release/deploy posture may have changed"]);
  }
  const seen = new Set();
  return suggestions.filter(([command]) => {
    if (seen.has(command)) return false;
    seen.add(command);
    return true;
  });
}

export function formatWorktreeSummary({ entries = statusEntries(), sampleLimit = 8 } = {}) {
  const groups = summarize(entries);
  const lines = [
    "Worktree summary",
    `  changed paths: ${entries.length}`,
  ];
  if (!entries.length) {
    lines.push("  clean working tree");
    return lines.join("\n");
  }

  for (const group of groups) {
    if (!group.entries.length) continue;
    lines.push("");
    lines.push(`== ${group.label} ==`);
    lines.push(`  ${group.entries.length} path(s): ${countText(group.entries)}`);
    for (const entry of group.entries.slice(0, sampleLimit)) {
      lines.push(`  ${entry.code} ${entry.file}`);
    }
    if (group.entries.length > sampleLimit) {
      lines.push(`  ... ${group.entries.length - sampleLimit} more`);
    }
  }

  const suggestions = gateSuggestions(groups);
  if (suggestions.length) {
    lines.push("");
    lines.push("Suggested gates");
    for (const [command, reason] of suggestions) {
      lines.push(`  ${command}  # ${reason}`);
    }
  }
  return lines.join("\n");
}
