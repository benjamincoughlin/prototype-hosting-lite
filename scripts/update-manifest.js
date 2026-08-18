#!/usr/bin/env node
// Inserts or updates one entry in docs/prototypes.json. The manifest is
// what both the admin dashboard and (indirectly, via each prototype's own
// config.json) the gate pages rely on for status.

const fs = require("node:fs");
const path = require("node:path");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    args[argv[i].replace(/^--/, "")] = argv[i + 1];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const slug = args.slug;
const repoUrl = args["repo-url"];
const expiresAt = args["expires-at"] || null;
const status = args.status;
const runUrl = args["run-url"];

if (!slug || !status) {
  console.error(
    "Usage: update-manifest.js --slug <slug> --status <status> [--repo-url <url>] [--expires-at <iso>] [--run-url <url>]"
  );
  process.exit(1);
}

const manifestPath = path.join(__dirname, "..", "docs", "prototypes.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const now = new Date().toISOString();
const existingIndex = manifest.findIndex((p) => p.slug === slug);
const existing = existingIndex >= 0 ? manifest[existingIndex] : null;

const entry = {
  slug,
  repoUrl: repoUrl || existing?.repoUrl || null,
  status,
  expiresAt: expiresAt || existing?.expiresAt || null,
  createdAt: existing?.createdAt || now,
  updatedAt: now,
  lastRunUrl: runUrl || existing?.lastRunUrl || null,
};

if (existingIndex >= 0) {
  manifest[existingIndex] = entry;
} else {
  manifest.push(entry);
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Updated manifest entry for "${slug}" (status: ${status})`);
