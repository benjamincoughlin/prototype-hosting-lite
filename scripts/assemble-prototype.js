#!/usr/bin/env node
// Assembles a built prototype into docs/p/<slug>/: the gate page at the
// root (must load first), the built app nested under app/ so the gate
// page's own index.html isn't shadowed by the app's, and a config.json
// the gate page reads client-side.

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
const passwordHash = args["password-hash"];
const passwordSalt = args["password-salt"];
const expiresAt = args["expires-at"] || null;
const buildOutput = args["build-output"];
const dest = args.dest;

if (!slug || !passwordHash || !passwordSalt || !buildOutput || !dest) {
  console.error(
    "Usage: assemble-prototype.js --slug <slug> --password-hash <hash> --password-salt <salt> --expires-at <iso|''> --build-output <dir> --dest <dir>"
  );
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

fs.cpSync(buildOutput, path.join(dest, "app"), { recursive: true });

const config = { slug, passwordHash, passwordSalt, expiresAt, status: "LIVE" };
fs.writeFileSync(
  path.join(dest, "config.json"),
  JSON.stringify(config, null, 2) + "\n"
);

const gateHtml = fs.readFileSync(
  path.join(__dirname, "gate-template.html"),
  "utf8"
);
fs.writeFileSync(path.join(dest, "index.html"), gateHtml);

console.log(`Assembled prototype "${slug}" at ${dest}`);
