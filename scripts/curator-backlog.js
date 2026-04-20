#!/usr/bin/env node

/**
 * curator-backlog.js
 * Utility for managing the Curator's improvement backlog.
 *
 * Usage:
 *   node scripts/curator-backlog.js init          — Initialize backlog directory
 *   node scripts/curator-backlog.js list           — List all backlog items
 *   node scripts/curator-backlog.js list --tier safe|moderate|broad
 *   node scripts/curator-backlog.js add <json>     — Add item from JSON string
 *   node scripts/curator-backlog.js update <id> <json> — Update item by ID
 *   node scripts/curator-backlog.js remove <id>    — Remove item by ID
 *   node scripts/curator-backlog.js stats          — Show backlog statistics
 *   node scripts/curator-backlog.js export         — Export backlog as JSON
 *   node scripts/curator-backlog.js prune          — Remove resolved/deferred items older than 30 days
 */

const fs = require("fs");
const path = require("path");

const BACKLOG_DIR = path.resolve(__dirname, "../thoughts/curator-backlog");
const BACKLOG_FILE = path.join(BACKLOG_DIR, "backlog.json");

// Colors
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

function color(str, c) {
  return process.stdout.isTTY ? `${c}${str}${colors.reset}` : str;
}
function pass(str) { return color(str, colors.green); }
function fail(str) { return color(str, colors.red); }
function warn(str) { return color(str, colors.yellow); }
function info(str) { return color(str, colors.cyan); }
function bold(str) { return color(str, colors.bold); }

function ensureDir() {
  if (!fs.existsSync(BACKLOG_DIR)) {
    fs.mkdirSync(BACKLOG_DIR, { recursive: true });
  }
}

function readBacklog() {
  ensureDir();
  if (!fs.existsSync(BACKLOG_FILE)) {
    return { items: [], nextId: 1 };
  }
  try {
    return JSON.parse(fs.readFileSync(BACKLOG_FILE, "utf-8"));
  } catch {
    return { items: [], nextId: 1 };
  }
}

function writeBacklog(backlog) {
  ensureDir();
  fs.writeFileSync(BACKLOG_FILE, JSON.stringify(backlog, null, 2) + "\n");
}

function nextId(backlog) {
  const id = `CUR-${String(backlog.nextId).padStart(3, "0")}`;
  backlog.nextId++;
  return id;
}

function calculatePriority(frequency, impact, effort) {
  return frequency * impact * (6 - effort);
}

function getTier(score) {
  if (score <= 20) return "safe";
  if (score <= 60) return "moderate";
  return "broad";
}

// Commands
function cmdInit() {
  ensureDir();
  if (!fs.existsSync(BACKLOG_FILE)) {
    writeBacklog({ items: [], nextId: 1 });
    console.log(pass("✓ Backlog initialized at"), BACKLOG_FILE);
  } else {
    console.log(info("Backlog already exists at"), BACKLOG_FILE);
  }
}

function cmdList(tier) {
  const backlog = readBacklog();
  if (backlog.items.length === 0) {
    console.log(info("Backlog is empty"));
    return;
  }

  let items = backlog.items;
  if (tier) {
    items = items.filter((i) => i.tier === tier);
  }

  items.sort((a, b) => b.priority_score - a.priority_score);

  console.log(bold(`\n=== Backlog (${items.length} items) ===\n`));

  for (const item of items) {
    const tierIcon =
      item.tier === "safe"
        ? pass("🟢")
        : item.tier === "moderate"
        ? warn("🟡")
        : fail("🔴");
    const statusColor =
      item.status === "applied"
        ? pass(item.status)
        : item.status === "rejected"
        ? fail(item.status)
        : item.status === "deferred"
        ? warn(item.status)
        : info(item.status);

    console.log(`  ${tierIcon} ${bold(item.id)}: ${item.title}`);
    console.log(`    Score: ${item.priority_score} | Status: ${statusColor}`);
    console.log(`    Files: ${(item.files_affected || []).join(", ") || "none"}`);
    console.log(`    Created: ${item.created}`);
    console.log("");
  }
}

function cmdAdd(jsonStr) {
  const backlog = readBacklog();
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    console.log(fail("Invalid JSON. Provide a valid JSON string."));
    process.exit(1);
  }

  const frequency = data.frequency || 1;
  const impact = data.impact || 1;
  const effort = data.effort || 1;
  const score = calculatePriority(frequency, impact, effort);

  const item = {
    id: nextId(backlog),
    title: data.title || "Untitled",
    tier: getTier(score),
    priority_score: score,
    frequency,
    impact,
    effort,
    evidence: data.evidence || [],
    proposal: data.proposal || "",
    files_affected: data.files_affected || [],
    risk_assessment: data.risk_assessment || "Unknown",
    rollback_plan: data.rollback_plan || "Git revert",
    status: "backlog",
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };

  backlog.items.push(item);
  writeBacklog(backlog);

  console.log(pass(`✓ Added ${item.id}: ${item.title}`));
  console.log(`  Tier: ${item.tier} | Score: ${item.priority_score}`);
}

function cmdUpdate(id, jsonStr) {
  const backlog = readBacklog();
  const item = backlog.items.find((i) => i.id === id);
  if (!item) {
    console.log(fail(`Item ${id} not found`));
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    console.log(fail("Invalid JSON. Provide a valid JSON string."));
    process.exit(1);
  }

  Object.assign(item, data, { updated: new Date().toISOString() });
  writeBacklog(backlog);

  console.log(pass(`✓ Updated ${id}`));
}

function cmdRemove(id) {
  const backlog = readBacklog();
  const idx = backlog.items.findIndex((i) => i.id === id);
  if (idx === -1) {
    console.log(fail(`Item ${id} not found`));
    process.exit(1);
  }

  const [removed] = backlog.items.splice(idx, 1);
  writeBacklog(backlog);

  console.log(pass(`✓ Removed ${id}: ${removed.title}`));
}

function cmdStats() {
  const backlog = readBacklog();
  const items = backlog.items;

  if (items.length === 0) {
    console.log(info("Backlog is empty"));
    return;
  }

  const byTier = { safe: 0, moderate: 0, broad: 0 };
  const byStatus = {};
  let totalScore = 0;

  for (const item of items) {
    byTier[item.tier] = (byTier[item.tier] || 0) + 1;
    byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    totalScore += item.priority_score;
  }

  console.log(bold("\n=== Backlog Statistics ===\n"));
  console.log(`  Total items: ${bold(String(items.length))}`);
  console.log(`  Average score: ${(totalScore / items.length).toFixed(1)}`);
  console.log("");
  console.log(bold("  By Tier:"));
  console.log(`    🟢 Safe: ${byTier.safe}`);
  console.log(`    🟡 Moderate: ${byTier.moderate}`);
  console.log(`    🔴 Broad: ${byTier.broad}`);
  console.log("");
  console.log(bold("  By Status:"));
  for (const [status, count] of Object.entries(byStatus)) {
    console.log(`    ${status}: ${count}`);
  }
  console.log("");
}

function cmdExport() {
  const backlog = readBacklog();
  console.log(JSON.stringify(backlog, null, 2));
}

function cmdPrune() {
  const backlog = readBacklog();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const before = backlog.items.length;
  backlog.items = backlog.items.filter((item) => {
    if (item.status === "applied" || item.status === "rejected") {
      const updated = new Date(item.updated);
      return updated > cutoff;
    }
    return true;
  });
  const removed = before - backlog.items.length;

  writeBacklog(backlog);
  console.log(pass(`✓ Pruned ${removed} old items (${backlog.items.length} remaining)`));
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.log("Usage: node scripts/curator-backlog.js <command> [args]");
  console.log("");
  console.log("Commands:");
  console.log("  init                          Initialize backlog directory");
  console.log("  list [--tier safe|moderate|broad]  List backlog items");
  console.log("  add <json>                    Add item from JSON string");
  console.log("  update <id> <json>            Update item by ID");
  console.log("  remove <id>                   Remove item by ID");
  console.log("  stats                         Show backlog statistics");
  console.log("  export                        Export backlog as JSON");
  console.log("  prune                         Remove old resolved items");
  process.exit(0);
}

switch (command) {
  case "init":
    cmdInit();
    break;
  case "list":
    cmdList(args.includes("--tier") ? args[args.indexOf("--tier") + 1] : null);
    break;
  case "add":
    cmdAdd(args.slice(1).join(" "));
    break;
  case "update":
    cmdUpdate(args[1], args.slice(2).join(" "));
    break;
  case "remove":
    cmdRemove(args[1]);
    break;
  case "stats":
    cmdStats();
    break;
  case "export":
    cmdExport();
    break;
  case "prune":
    cmdPrune();
    break;
  default:
    console.log(fail(`Unknown command: ${command}`));
    process.exit(1);
}
