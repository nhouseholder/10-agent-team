#!/usr/bin/env node
/**
 * Think Tool Validator
 *
 * Parses agent output for THINK_TOOL blocks and validates schema compliance.
 * Lightweight linter — not a runtime blocker.
 *
 * Usage:
 *   node scripts/validate-think-tool.js <file>
 *   node scripts/validate-think-tool.js --sample
 *
 * Exit codes:
 *   0 = valid or no think tool found (FAST mode — no think tool needed)
 *   1 = violations found
 */

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");

// Evidence budget per mode (from cognitive-kernel.md §5, §6, §7)
const EVIDENCE_BUDGET = {
  fast: 0,
  deliberate: 1,
  slow: 3, // anchor + 3 additional pulls
};

// Required fields for DELIBERATE and SLOW modes
const REQUIRED_FIELDS = [
  "mode",
  "gist",
  "evidence_log",
  "disconfirmer",
  "wysiati",
  "decision",
  "terminal",
];

// Fields that must be non-empty strings (not null, not empty, not "none"/"nothing")
const NON_EMPTY_STRING_FIELDS = ["gist", "disconfirmer", "wysiati", "decision"];

// Tool calls that count as evidence pulls
const EVIDENCE_TOOLS = new Set([
  "read",
  "grep",
  "glob",
  "brain-router_brain_query",
  "engram_mem_search",
  "engram_mem_timeline",
  "webfetch",
  "mempalace_mempalace_search",
]);

function parseThinkTools(content) {
  const tools = [];
  const regex = /THINK_TOOL:\s*\n([\s\S]*?)(?=\n\n|\n[A-Z_]+:|\n---|$)/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const block = match[1];
    const parsed = parseYamlLike(block);
    if (parsed) {
      tools.push({
        raw: match[0],
        parsed,
        startIndex: match.index,
      });
    }
  }

  return tools;
}

function parseYamlLike(block) {
  const result = {};
  const lines = block.split("\n");
  let currentKey = null;
  let currentList = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const keyMatch = trimmed.match(/^(\w+):\s*(.*)$/);

    if (keyMatch) {
      const [, key, value] = keyMatch;
      currentKey = key;

      if (value === "" || value === null) {
        // Could be a nested object or list starting next line
        result[key] = null;
        currentList = null;
      } else if (value.startsWith("[") && value.endsWith("]")) {
        // Inline array
        result[key] = value
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""));
        currentList = null;
      } else if (value === "null") {
        result[key] = null;
        currentList = null;
      } else {
        result[key] = value.replace(/^["']|["']$/g, "");
        currentList = null;
      }
    } else if (trimmed.startsWith("- ")) {
      // List item
      const itemValue = trimmed.slice(2).trim();
      const itemKeyMatch = itemValue.match(/^(\w+):\s*(.*)$/);

      if (itemKeyMatch) {
        const [, itemKey, itemValueStr] = itemKeyMatch;
        // Check if this is a pull_N key (which starts nested object)
        if (itemKey.match(/^pull_\d+$/)) {
          if (!result[currentKey]) result[currentKey] = [];
          if (!Array.isArray(result[currentKey])) result[currentKey] = [];
          currentList = {};
          currentList[itemKey] = itemValueStr.replace(/^["']|["']$/g, "");
          result[currentKey].push(currentList);
          currentList = null;
        } else {
          // Named list item like "- tool: read"
          if (!result[currentKey]) result[currentKey] = [];
          if (!Array.isArray(result[currentKey])) result[currentKey] = [];
          if (!currentList) currentList = {};
          currentList[itemKey] = itemValueStr.replace(/^["']|["']$/g, "");
          result[currentKey].push(currentList);
          currentList = null;
        }
      } else {
        // Simple list item
        if (!result[currentKey]) result[currentKey] = [];
        if (!Array.isArray(result[currentKey])) result[currentKey] = [];
        result[currentKey].push(itemValue.replace(/^["']|["']$/g, ""));
        currentList = null;
      }
    } else if (trimmed.startsWith("tool:") || trimmed.startsWith("target:") || trimmed.startsWith("finding:")) {
      // Nested fields under list items
      const nestedMatch = trimmed.match(/^(\w+):\s*(.*)$/);
      if (nestedMatch && result[currentKey] && Array.isArray(result[currentKey]) && result[currentKey].length > 0) {
        const lastItem = result[currentKey][result[currentKey].length - 1];
        if (typeof lastItem === "object" && lastItem !== null) {
          lastItem[nestedMatch[1]] = nestedMatch[2].replace(/^["']|["']$/g, "");
        }
      }
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

function countEvidencePullsInOutput(content) {
  const pulls = [];

  // Match tool_use blocks or inline tool calls
  const toolCallRegex = /<(\w+):(\w+)>/g;
  let match;
  while ((match = toolCallRegex.exec(content)) !== null) {
    const toolName = match[2];
    if (EVIDENCE_TOOLS.has(toolName)) {
      pulls.push({ tool: toolName, index: match.index });
    }
  }

  // Also match function-style calls like `read("file")` or `grep(...)`
  const funcCallRegex = /\b(read|grep|glob|brain-router_brain_query|engram_mem_search|engram_mem_timeline|webfetch|mempalace_mempalace_search)\s*\(/g;
  while ((match = funcCallRegex.exec(content)) !== null) {
    pulls.push({ tool: match[1], index: match.index });
  }

  // Also match markdown code blocks with tool calls
  const codeBlockRegex = /```\n?(\w+)\n([\s\S]*?)```/g;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const lang = match[1];
    if (EVIDENCE_TOOLS.has(lang)) {
      pulls.push({ tool: lang, index: match.index });
    }
  }

  return pulls;
}

function countEvidenceLogEntries(evidenceLog) {
  if (!evidenceLog) return 0;
  if (Array.isArray(evidenceLog)) {
    return evidenceLog.filter((item) => {
      if (typeof item === "string") return item.trim().length > 0;
      if (typeof item === "object" && item !== null) {
        return Object.keys(item).some((k) => k.startsWith("pull_"));
      }
      return false;
    }).length;
  }
  return 0;
}

function validateThinkTool(tool, fullContent) {
  const violations = [];
  const parsed = tool.parsed;
  const mode = (parsed.mode || "").toLowerCase();

  // Skip FAST mode — no think tool needed
  if (mode === "fast") {
    return violations;
  }

  // Validate required fields
  for (const field of REQUIRED_FIELDS) {
    if (!(field in parsed) || parsed[field] === null || parsed[field] === undefined) {
      violations.push({
        field,
        message: `Missing required field: ${field}`,
        severity: "error",
      });
    }
  }

  // Validate non-empty string fields
  for (const field of NON_EMPTY_STRING_FIELDS) {
    const value = parsed[field];
    if (value !== undefined && value !== null) {
      const strValue = String(value).trim().toLowerCase();
      if (strValue === "" || strValue === "none" || strValue === "nothing" || strValue === "n/a") {
        violations.push({
          field,
          message: `Field '${field}' must not be empty, "none", "nothing", or "n/a"`,
          severity: "error",
        });
      }
    }
  }

  // Validate wysiati specifically
  const wysiati = String(parsed.wysiati || "").trim().toLowerCase();
  if (wysiati === "nothing is missing" || wysiati === "none missing" || wysiati === "no missing evidence") {
    violations.push({
      field: "wysiati",
      message: "wysiati claims 'nothing is missing' — this is a WYSIATI violation. Name at least one gap.",
      severity: "error",
    });
  }

  // Validate evidence log length vs budget
  const evidenceLog = parsed.evidence_log;
  const logEntries = countEvidenceLogEntries(evidenceLog);
  const budget = EVIDENCE_BUDGET[mode];

  if (budget !== undefined && logEntries > budget) {
    violations.push({
      field: "evidence_log",
      message: `Evidence log has ${logEntries} entries but mode '${mode}' budget is ${budget}`,
      severity: "error",
    });
  }

  // Validate evidence log matches actual tool calls in output
  const actualPulls = countEvidencePullsInOutput(fullContent);
  if (logEntries !== actualPulls.length) {
    violations.push({
      field: "evidence_log",
      message: `Evidence log has ${logEntries} entries but output contains ${actualPulls.length} evidence tool call(s)`,
      severity: "warning",
    });
  }

  // Validate disconfirmer is present and non-empty
  const disconfirmer = String(parsed.disconfirmer || "").trim();
  if (!disconfirmer || disconfirmer.length < 5) {
    violations.push({
      field: "disconfirmer",
      message: "disconfirmer must be present and substantive (at least 5 characters)",
      severity: "error",
    });
  }

  // Validate terminal state
  const validTerminals = ["done", "ask", "escalate"];
  const terminal = String(parsed.terminal || "").toLowerCase();
  if (terminal && !validTerminals.includes(terminal)) {
    violations.push({
      field: "terminal",
      message: `Invalid terminal state '${terminal}'. Must be one of: ${validTerminals.join(", ")}`,
      severity: "error",
    });
  }

  // Validate mode is known
  const validModes = ["fast", "deliberate", "slow"];
  if (mode && !validModes.includes(mode)) {
    violations.push({
      field: "mode",
      message: `Invalid mode '${mode}'. Must be one of: ${validModes.join(", ")}`,
      severity: "error",
    });
  }

  // SLOW mode: pre_mortem is mandatory
  if (mode === "slow") {
    const preMortem = parsed.pre_mortem;
    if (!preMortem || (Array.isArray(preMortem) && preMortem.length === 0)) {
      violations.push({
        field: "pre_mortem",
        message: "SLOW mode requires pre_mortem with at least one entry",
        severity: "error",
      });
    }
  }

  return violations;
}

function validateFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const tools = parseThinkTools(content);

  if (tools.length === 0) {
    // No think tool found — this is valid for FAST mode
    return {
      file: filePath,
      thinkToolsFound: 0,
      violations: [],
      valid: true,
      message: "No THINK_TOOL blocks found (FAST mode — no validation needed)",
    };
  }

  const allViolations = [];
  for (const tool of tools) {
    const toolViolations = validateThinkTool(tool, content);
    allViolations.push(
      ...toolViolations.map((v) => ({
        ...v,
        thinkToolIndex: tools.indexOf(tool),
      }))
    );
  }

  const errors = allViolations.filter((v) => v.severity === "error");
  const warnings = allViolations.filter((v) => v.severity === "warning");

  return {
    file: filePath,
    thinkToolsFound: tools.length,
    violations: allViolations,
    errors: errors.length,
    warnings: warnings.length,
    valid: errors.length === 0,
    message:
      errors.length === 0
        ? `All ${tools.length} THINK_TOOL block(s) valid${warnings.length > 0 ? ` (${warnings.length} warning(s))` : ""}`
        : `Found ${errors.length} error(s) in ${tools.length} THINK_TOOL block(s)`,
  };
}

function formatOutput(results, format = "json") {
  if (format === "json") {
    return JSON.stringify(results, null, 2);
  }

  // Human-readable format
  const lines = [];
  for (const result of results) {
    const status = result.valid ? "✅ VALID" : "❌ INVALID";
    lines.push(`${status}  ${path.relative(ROOT_DIR, result.file)}`);
    if (result.message) {
      lines.push(`   ${result.message}`);
    }
    for (const v of result.violations) {
      const icon = v.severity === "error" ? "  ✗" : "  ⚠";
      lines.push(`${icon} [${v.field}] ${v.message}`);
    }
    if (result.violations.length > 0) lines.push("");
  }

  const totalErrors = results.reduce((sum, r) => sum + (r.errors || 0), 0);
  const totalWarnings = results.reduce((sum, r) => sum + (r.warnings || 0), 0);
  lines.push(`---`);
  lines.push(`Total: ${results.length} file(s), ${totalErrors} error(s), ${totalWarnings} warning(s)`);

  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const files = [];
  let format = "json";
  let useSample = false;

  for (const arg of args) {
    if (arg === "--sample") {
      useSample = true;
    } else if (arg === "--format=text") {
      format = "text";
    } else if (!arg.startsWith("--")) {
      files.push(arg);
    }
  }

  if (useSample) {
    const samplePath = path.join(ROOT_DIR, "tests/fixtures/valid-think-tool.md");
    if (!fs.existsSync(samplePath)) {
      console.error(`Sample file not found: ${samplePath}`);
      process.exit(1);
    }
    files.push(samplePath);
  }

  if (files.length === 0) {
    console.error("Usage: node scripts/validate-think-tool.js <file> [<file>...]");
    console.error("       node scripts/validate-think-tool.js --sample");
    console.error("       node scripts/validate-think-tool.js --sample --format=text");
    process.exit(1);
  }

  const results = [];
  for (const file of files) {
    const absolutePath = path.isAbsolute(file) ? file : path.join(ROOT_DIR, file);
    if (!fs.existsSync(absolutePath)) {
      results.push({
        file: absolutePath,
        thinkToolsFound: 0,
        violations: [{ field: "file", message: `File not found: ${absolutePath}`, severity: "error" }],
        errors: 1,
        warnings: 0,
        valid: false,
        message: "File not found",
      });
      continue;
    }
    results.push(validateFile(absolutePath));
  }

  console.log(formatOutput(results, format));

  const hasErrors = results.some((r) => !r.valid);
  process.exit(hasErrors ? 1 : 0);
}

module.exports = {
  parseThinkTools,
  parseYamlLike,
  validateThinkTool,
  validateFile,
  countEvidencePullsInOutput,
  countEvidenceLogEntries,
  EVIDENCE_BUDGET,
  REQUIRED_FIELDS,
};

if (require.main === module) {
  main();
}
