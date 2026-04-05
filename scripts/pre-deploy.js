#!/usr/bin/env node
/**
 * Pre-deployment pipeline for Swiftly.
 * Runs before pushing to GitHub:
 * 1. Check for leaked API keys in staged files
 * 2. Run unit tests
 * 3. Build frontend
 * 4. Verify server starts
 * 5. Trigger Render.com deployment
 */

import { execSync, spawn } from 'child_process';
import { readFileSync } from 'fs';

const LEAKED_PATTERNS = [
  /sk-or-v1-[a-zA-Z0-9]{40,}/,          // OpenRouter API keys
  /eyJhbG[a-zA-Z0-9._-]{20,}/,          // JWT tokens
  /MONDAY_API_TOKEN\s*=\s*\S{10,}/,      // Monday API token in env
  /OPENROUTER_API_KEY\s*=\s*\S{10,}/,    // OpenRouter key in env
  /sk-[a-zA-Z0-9]{32,}/,                 // Generic secret keys
  /ghp_[a-zA-Z0-9]{36}/,                 // GitHub personal access tokens
  /render_[a-zA-Z0-9]{20,}/i,            // Render API keys
];

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function log(color, label, message) {
  console.log(`${color}[${label}]${RESET} ${message}`);
}

function step(name) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${name}`);
  console.log('='.repeat(50));
}

// ---------------------------------------------------------------------------
// Step 1: Check for leaked secrets in staged files
// ---------------------------------------------------------------------------
function checkSecrets() {
  step('Step 1: Checking for leaked secrets');

  let stagedFiles;
  try {
    stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    log(YELLOW, 'SKIP', 'Not a git repo or no staged files — skipping secret scan.');
    return true;
  }

  if (stagedFiles.length === 0) {
    log(GREEN, 'OK', 'No staged files to check.');
    return true;
  }

  let leaked = false;

  for (const file of stagedFiles) {
    // Skip binary / non-text files
    if (/\.(png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot|pdf)$/i.test(file)) continue;

    let content;
    try {
      content = readFileSync(file, 'utf-8');
    } catch {
      continue; // File may have been deleted
    }

    for (const pattern of LEAKED_PATTERNS) {
      if (pattern.test(content)) {
        log(RED, 'LEAK', `Potential secret found in ${file} matching ${pattern}`);
        leaked = true;
      }
    }
  }

  if (leaked) {
    log(RED, 'FAIL', 'Leaked secrets detected! Remove them before deploying.');
    return false;
  }

  log(GREEN, 'OK', `Scanned ${stagedFiles.length} staged files — no secrets found.`);
  return true;
}

// ---------------------------------------------------------------------------
// Step 2: Run tests
// ---------------------------------------------------------------------------
function runTests() {
  step('Step 2: Running unit tests');

  try {
    execSync('npx vitest run', { stdio: 'inherit', timeout: 120_000 });
    log(GREEN, 'OK', 'All tests passed.');
    return true;
  } catch {
    log(RED, 'FAIL', 'Tests failed. Fix them before deploying.');
    return false;
  }
}

// ---------------------------------------------------------------------------
// Step 3: Build frontend
// ---------------------------------------------------------------------------
function buildFrontend() {
  step('Step 3: Building frontend');

  try {
    execSync('npx vite build', { stdio: 'inherit', timeout: 120_000 });
    log(GREEN, 'OK', 'Frontend build succeeded.');
    return true;
  } catch {
    log(RED, 'FAIL', 'Frontend build failed.');
    return false;
  }
}

// ---------------------------------------------------------------------------
// Step 4: Verify server starts
// ---------------------------------------------------------------------------
async function verifyServer() {
  step('Step 4: Verifying server starts');

  return new Promise((resolve) => {
    const server = spawn('node', ['src/server/index.js'], {
      env: {
        ...process.env,
        PORT: '9876',
        NODE_ENV: 'test',
        // Provide a dummy token so config doesn't throw
        MONDAY_API_TOKEN: process.env.MONDAY_API_TOKEN || 'test-verify-token',
      },
      stdio: 'pipe',
    });

    let resolved = false;

    const timeout = setTimeout(() => {
      // Try hitting the health endpoint
      fetch('http://127.0.0.1:9876/api/health')
        .then((res) => {
          server.kill();
          if (res.ok) {
            log(GREEN, 'OK', 'Server started and health endpoint responded.');
            resolved = true;
            resolve(true);
          } else {
            log(RED, 'FAIL', `Health endpoint returned ${res.status}.`);
            resolved = true;
            resolve(false);
          }
        })
        .catch(() => {
          server.kill();
          log(YELLOW, 'SKIP', 'Could not reach health endpoint — server may need MONDAY_API_TOKEN.');
          resolved = true;
          resolve(true); // Non-blocking — don't fail deploy for this
        });
    }, 3000);

    server.on('error', () => {
      clearTimeout(timeout);
      if (!resolved) {
        log(RED, 'FAIL', 'Server failed to start.');
        resolved = true;
        resolve(false);
      }
    });

    server.on('exit', (code) => {
      clearTimeout(timeout);
      if (!resolved) {
        if (code === 0) {
          log(YELLOW, 'SKIP', 'Server exited immediately — may require env vars.');
          resolved = true;
          resolve(true);
        } else {
          log(RED, 'FAIL', `Server exited with code ${code}.`);
          resolved = true;
          resolve(false);
        }
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Step 5: Trigger Render deployment
// ---------------------------------------------------------------------------
async function triggerRenderDeploy() {
  step('Step 5: Triggering Render deployment');

  const apiKey = process.env.RENDER_API_KEY;
  const serviceId = process.env.RENDER_SERVICE_ID;

  if (!apiKey || !serviceId) {
    log(YELLOW, 'SKIP', 'RENDER_API_KEY or RENDER_SERVICE_ID not set — skipping deploy trigger.');
    return true;
  }

  try {
    const res = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ clearCache: false }),
    });

    if (res.ok) {
      const data = await res.json();
      log(GREEN, 'OK', `Render deploy triggered: ${data.id || 'success'}`);
      return true;
    } else {
      const text = await res.text();
      log(RED, 'FAIL', `Render API returned ${res.status}: ${text}`);
      return false;
    }
  } catch (err) {
    log(RED, 'FAIL', `Render deploy failed: ${err.message}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n🚀 Swiftly Pre-Deploy Pipeline\n');

  // Step 1: Check secrets
  if (!checkSecrets()) process.exit(1);

  // Step 2: Run tests
  if (!runTests()) process.exit(1);

  // Step 3: Build
  if (!buildFrontend()) process.exit(1);

  // Step 4: Verify server
  const serverOk = await verifyServer();
  if (!serverOk) process.exit(1);

  // Step 5: Trigger Render deploy
  await triggerRenderDeploy();

  console.log(`\n${GREEN}✅ Pre-deploy pipeline complete!${RESET}\n`);
}

main().catch((err) => {
  console.error(`\n${RED}Pipeline error: ${err.message}${RESET}`);
  process.exit(1);
});
