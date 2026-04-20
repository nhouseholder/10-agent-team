#!/usr/bin/env node

/**
 * validate-agents.js
 * Validates all agent prompt files against CONTRIBUTING.md requirements.
 *
 * Usage: node scripts/validate-agents.js
 * Exit code: 0 = all pass, 1 = any fail
 */

const fs = require("fs");
const path = require("path");

const AGENTS_DIR = path.resolve(__dirname, "../agents");
const SHARED_MEMORY = path.resolve(AGENTS_DIR, "_shared/memory-systems.md");

// Colors for TTY output
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

// Required frontmatter fields
const REQUIRED_FRONTMATTER = ["name", "description", "mode"];

// Required sections in every agent
const REQUIRED_SECTIONS = [
  { key: "Role", pattern: /##\s+Role/i },
  { key: "Output Format", pattern: /##\s+Output\s+Format/i },
  { key: "Escalation Protocol", pattern: /##\s+Escalation/i },
  { key: "Memory Systems", pattern: /##\s*MEMORY\s+SYSTEMS|memory-systems\.md/i },
  { key: "Constraints", pattern: /##\s+Constraints/i },
];

// Output format tags that must be present
const OUTPUT_FORMAT_TAGS = ["<summary>", "<next>"];

// Contradiction pairs (if both present, flag it)
const CONTRADICTION_PAIRS = [
  [/READ-ONLY/i, /implement|execute|write.*file|create.*file|modify/i],
  [/do not modify/i, /edit.*file|change.*file|update.*file/i],
];

// Hardcoded path patterns
const HARDCODED_PATH_PATTERNS = [
  /~\/\.claude\/skills\/website-design-agent\/design-refs/,
];

function getAgentFiles() {
  return fs
    .readdirSync(AGENTS_DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("gsd-"))
    .sort();
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) fields[kv[1].trim()] = kv[2].trim();
  }
  return fields;
}

function validateAgent(filename) {
  const filepath = path.join(AGENTS_DIR, filename);
  const content = fs.readFileSync(filepath, "utf-8");
  const errors = [];
  const warnings = [];

  // 1. Frontmatter
  const fm = parseFrontmatter(content);
  if (!fm) {
    errors.push("Missing frontmatter (--- block)");
  } else {
    for (const field of REQUIRED_FRONTMATTER) {
      if (!fm[field]) errors.push(`Missing frontmatter field: "${field}"`);
    }
  }

  // 2. Required sections
  for (const section of REQUIRED_SECTIONS) {
    if (!section.pattern.test(content)) {
      errors.push(`Missing section: "${section.key}"`);
    }
  }

  // 3. Output format tags
  if (/##\s+Output\s+Format/i.test(content)) {
    for (const tag of OUTPUT_FORMAT_TAGS) {
      if (!content.includes(tag)) {
        errors.push(`Output Format missing required tag: "${tag}"`);
      }
    }
  }

  // 4. Contradictions
  for (const [a, b] of CONTRADICTION_PAIRS) {
    if (a.test(content) && b.test(content)) {
      warnings.push(
        `Potential contradiction: READ-ONLY constraint conflicts with implementation language`
      );
    }
  }

  // 5. Hardcoded paths
  for (const pattern of HARDCODED_PATH_PATTERNS) {
    if (pattern.test(content)) {
      errors.push(`Hardcoded path found — use \${VAR:-default} syntax`);
    }
  }

  // 6. Memory systems reference check
  if (/##\s*MEMORY\s+SYSTEMS/i.test(content)) {
    // Inline memory block — check it references the shared file or has consistent content
    if (!content.includes("_shared/memory-systems.md")) {
      warnings.push(
        `Inline memory block — consider referencing agents/_shared/memory-systems.md`
      );
    }
  }

  return { filename, errors, warnings };
}

function validateOrchestratorDecisionTree(content) {
  // Check that the decision tree has at least the expected coverage
  const taskTypes = [
    "explore",
    "plan",
    "research",
    "design",
    "debug",
    "implement",
    "test",
    "refactor",
    "document",
    "deploy",
    "summarize",
  ];

  const found = [];
  const missing = [];

  for (const task of taskTypes) {
    if (content.toLowerCase().includes(task)) {
      found.push(task);
    } else {
      missing.push(task);
    }
  }

  return { found, missing };
}

function main() {
  console.log(bold("\n=== Agent Validation ===\n"));

  const agentFiles = getAgentFiles();
  if (agentFiles.length === 0) {
    console.log(fail("No agent files found in agents/ directory"));
    process.exit(1);
  }

  console.log(info(`Found ${agentFiles.length} agent files\n`));

  let totalErrors = 0;
  let totalWarnings = 0;
  let passedAgents = 0;
  const results = [];

  for (const file of agentFiles) {
    const result = validateAgent(file);
    results.push(result);
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
    if (result.errors.length === 0) passedAgents++;

    const status =
      result.errors.length === 0
        ? pass("PASS")
        : fail(`FAIL (${result.errors.length} error${result.errors.length > 1 ? "s" : ""})`);
    console.log(`  ${status}  ${file}`);

    for (const err of result.errors) {
      console.log(`    ${fail("✗")} ${err}`);
    }
    for (const w of result.warnings) {
      console.log(`    ${warn("⚠")} ${w}`);
    }
  }

  // Orchestrator decision tree check
  console.log(`\n${bold("Decision Tree Coverage:")}`);
  const orchestratorPath = path.join(AGENTS_DIR, "orchestrator.md");
  if (fs.existsSync(orchestratorPath)) {
    const orchestratorContent = fs.readFileSync(orchestratorPath, "utf-8");
    const coverage = validateOrchestratorDecisionTree(orchestratorContent);
    console.log(
      `  ${pass(`✓ ${coverage.found.length}/${coverage.found.length + coverage.missing.length} task types covered`)}`
    );
    if (coverage.missing.length > 0) {
      console.log(`  ${warn(`Missing: ${coverage.missing.join(", ")}`)}`);
    }
  } else {
    console.log(`  ${fail("✗ orchestrator.md not found")}`);
    totalErrors++;
  }

  // Shared memory file check
  console.log(`\n${bold("Shared Resources:")}`);
  if (fs.existsSync(SHARED_MEMORY)) {
    console.log(`  ${pass("✓")} agents/_shared/memory-systems.md exists`);
  } else {
    console.log(`  ${fail("✗")} agents/_shared/memory-systems.md missing`);
    totalErrors++;
  }

  // Summary
  console.log(`\n${bold("=== Summary ===")}`);
  console.log(
    `  Agents: ${pass(`${passedAgents}/${agentFiles.length} passed`)}`
  );
  console.log(`  Errors:   ${totalErrors === 0 ? pass("0") : fail(String(totalErrors))}`);
  console.log(`  Warnings: ${totalWarnings === 0 ? "0" : warn(String(totalWarnings))}`);

  if (totalErrors > 0) {
    console.log(`\n${fail("Validation FAILED")}\n`);
    process.exit(1);
  } else {
    console.log(`\n${pass("Validation PASSED")}\n`);
    process.exit(0);
  }
}

main();
