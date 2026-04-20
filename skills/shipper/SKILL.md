---
name: shipper
description: Unified deploy, version bump, git sync, and handoff skill. Combines deploy, version-bump, git-sorcery, full-handoff, and finishing-a-development-branch. One command to sync, bump, commit, push, deploy, and handoff.
use_when: >
  The user explicitly says "use shipper", "call shipper", "run shipper",
  "use deployer", "call deployer", "run deployer", "use deploy agent",
  "call deploy agent", "use releaser", "call releaser", "use publisher",
  "call publisher", "use launcher", "call launcher".
  OR the user wants to deploy, ship, release, push to production, create a handoff,
  finish a branch, bump version, or sync changes to GitHub.
---

# SHIPPER — Unified Deploy & Handoff

The single shipping skill. Replaces deploy, version-bump, full-handoff, finishing-a-development-branch.

## FULL SHIP (sync → bump → commit → push → deploy → handoff)

Run this when the user says "ship it", "deploy", "push and deploy", or "full handoff".

### Step 1: DETECT PROJECT

```bash
PROJECT_PATH=$(pwd)
PROJECT_NAME=$(basename "$PROJECT_PATH")
GITHUB_REPO=$(git remote get-url origin 2>/dev/null | sed 's|.*/||;s|\.git$||')
BRANCH=$(git branch --show-current)
```

### Step 2: PRE-FLIGHT GATES (MANDATORY)

```bash
# Gate 1: Clean working tree
git status --short
# If dirty → commit first

# Gate 2: Version regression check
# Read local version (package.json, version.js, etc.)
# Check live version (curl or browser)
# ABORT if local < live

# Gate 3: Lint + test + build
npm run lint 2>&1 && npm test 2>&1 && npm run build 2>&1
# ABORT if any fails
```

### Step 3: VERSION BUMP

```bash
# Analyze staged changes for bump type
git diff --cached --stat

# PATCH: bug fixes, minor tweaks
# MINOR: new features, enhancements
# MAJOR: breaking changes

# Bump (Node.js example)
npm version patch --no-git-tag-version  # or minor, or major

# Update version in all display locations (footer, about page, etc.)
```

### Step 4: COMMIT + PUSH

```bash
git add .
git commit -m "vX.Y.Z: [summary of changes]"
git push origin $BRANCH
```

### Step 5: DEPLOY

**Cloudflare Pages:**
```bash
# Clone to /tmp if iCloud project
git clone <repo> /tmp/<project>
cd /tmp/<project>
npm run build
npx wrangler pages deploy dist/ --project-name <PROJECT> 2>&1 | tee deploy.log
```

**Cloudflare Workers:**
```bash
npx wrangler deploy 2>&1 | tee deploy.log
```

### Step 6: VERIFY LIVE

```bash
# Wait for propagation
sleep 30

# Check HTTP status
curl -s -o /dev/null -w "%{http_code}" https://<LIVE_URL>

# Verify key pages load
# Check API endpoints respond
# Verify version number displays correctly
```

**Data Count Verification:**
```bash
# Compare pre/post deploy data counts
# If any data dropped >5% → ROLLBACK
```

### Step 7: TAG RELEASE

```bash
VERSION=$(node -p "require('./package.json').version" 2>/dev/null)
git tag -a "v$VERSION" -m "Release v$VERSION"
git push origin "v$VERSION"
```

### Step 8: HANDOFF

Create `handoffs/handoff_$(date +%Y-%m-%d_%H%M).md`:

```markdown
# Handoff — [PROJECT] — [YYYY-MM-DD HH:MM]
**Repo:** [repo] | **Branch:** [branch] | **Version:** [vX.Y.Z]
**Last commit:** [SHA] [date]

## 1. Session Summary
[What was accomplished]

## 2. What Changed
- [Task]: files → outcome

## 3. Deploy Status
- Version: [vX.Y.Z]
- Live URL: [url]
- HTTP Status: [200/other]
- Data verified: [yes/no]

## 4. Next Steps (Prioritized)
1. [Most important] — [why]
2. [Second] — [why]

## 5. Warnings
[Any failures, root causes, lessons learned]
```

```bash
git add handoffs/
git commit -m "handoff: $(date +%Y-%m-%d) — v[version] deploy"
git push
```

### Step 9: OUTPUT

```
SHIP COMPLETE
=============
Version: vX.Y.Z
Deployed: [url]
Commit: [SHA]
Tag: v[version]
Handoff: handoffs/[file]
Next: [recommended next step]
```

## PARTIAL SHIP (individual operations)

| Command | What it does |
|---|---|
| "bump version" | Steps 1-4 only (detect → bump → commit → push) |
| "deploy" | Steps 1-6 only (gates → deploy → verify) |
| "handoff" | Steps 1-2 + 8 only (detect → gather facts → write handoff) |
| "finish branch" | Present merge/PR/keep/discard options |

## ROLLBACK ON FAILURE

```bash
npx wrangler pages deployment rollback --project-name <PROJECT>
echo "ROLLBACK COMPLETE"
```

## RULES

1. **Never deploy without passing tests and lint**
2. **Never build/deploy from iCloud Drive** — clone to /tmp first
3. **Always snapshot current deployment** before deploying
4. **Always verify live site** after deployment
5. **Always rollback on verification failure**
6. **Version bump every meaningful commit**
7. **Handoff is the LAST thing** — after everything else is done
8. **Push unpushed work BEFORE handoff**
