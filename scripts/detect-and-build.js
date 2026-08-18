#!/usr/bin/env node
// Runs inside the GitHub Actions runner (see .github/workflows/build-prototype.yml).
// Given a cloned repo directory, detects the framework it was built with,
// installs deps, runs the appropriate build (using a RELATIVE base path so
// the output works when served from an unpredictable nested path like
// /p/<slug>/app/, not just from a domain root), and copies the static
// output into the destination directory.
//
// This is the framework-detection heuristic referenced in the project plan
// as an inherently best-effort boundary — repos this gets wrong need a
// manual override, which isn't built yet (see plan's Step 4/5 notes).
//
// Known limitation: Next.js static export does not support a relative
// base path (it always assumes an absolute `basePath` from the domain
// root), so a Next.js prototype will only render correctly if the source
// repo's own next.config.js already sets `basePath` to match where this
// tool deploys it — not something this script can inject generically.

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const [, , repoDir, outputDir] = process.argv;

if (!repoDir || !outputDir) {
  console.error("Usage: detect-and-build.js <repoDir> <outputDir>");
  process.exit(1);
}

function run(command, cwd) {
  console.log(`$ ${command}`);
  execSync(command, { cwd, stdio: "inherit" });
}

function readPackageJson(dir) {
  const pkgPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgPath)) return null;
  return JSON.parse(fs.readFileSync(pkgPath, "utf8"));
}

function copyDir(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
}

function detectAndBuild() {
  const pkg = readPackageJson(repoDir);

  if (!pkg) {
    console.log("No package.json found — treating repo as plain static HTML.");
    const staticRoot = ["public", "dist", "www"]
      .map((d) => path.join(repoDir, d))
      .find((d) => fs.existsSync(d));
    copyDir(staticRoot ?? repoDir, outputDir);
    return;
  }

  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  run("npm ci || npm install", repoDir);

  if (deps.next) {
    console.log("Detected Next.js — building static export.");
    run("npm run build", repoDir);
    const outDir = path.join(repoDir, "out");
    if (!fs.existsSync(outDir)) {
      throw new Error(
        'Next.js build did not produce an "out" directory. ' +
          'Ensure next.config.js has `output: "export"` set.'
      );
    }
    copyDir(outDir, outputDir);
    return;
  }

  if (deps.vite) {
    console.log("Detected Vite — building with a relative base path.");
    run("npx vite build --base=./", repoDir);
    copyDir(path.join(repoDir, "dist"), outputDir);
    return;
  }

  if (deps["react-scripts"]) {
    console.log("Detected Create React App — building with a relative homepage.");
    run("npm pkg set homepage=.", repoDir);
    run("npm run build", repoDir);
    copyDir(path.join(repoDir, "build"), outputDir);
    return;
  }

  // Generic fallback: run the declared build script if there is one, then
  // guess the output directory from common conventions.
  if (pkg.scripts && pkg.scripts.build) {
    console.log("Unrecognized framework — running declared `npm run build` script.");
    run("npm run build", repoDir);
    const guess = ["dist", "build", "out"]
      .map((d) => path.join(repoDir, d))
      .find((d) => fs.existsSync(d));
    if (!guess) {
      throw new Error(
        "Build script ran but no dist/build/out directory was found. " +
          "This repo needs a manual build-command/output-dir override."
      );
    }
    copyDir(guess, outputDir);
    return;
  }

  throw new Error(
    "Could not detect a known framework (Next.js, Vite, CRA) or a build script. " +
      "This repo needs a manual build-command/output-dir override."
  );
}

detectAndBuild();
console.log(`Build output ready at ${outputDir}`);
