![logo](https://github.com/lee-to/ai-factory/raw/main/art/promo.png)

# AI Factory

> **Stop configuring. Start building.**

You want to build with AI, but setting up the right context, prompts, and workflows takes time. AI Factory handles all of that so you can focus on what matters — shipping quality code.

**One command. Full AI-powered development environment.**

```bash
ai-factory init
```

---

## Why AI Factory?

- **Zero configuration** — detects your stack, installs relevant skills, configures integrations
- **Best practices built-in** — logging, commits, code review, all following industry standards
- **Spec-driven development** — AI follows plans, not random exploration. Predictable, resumable, reviewable
- **Community skills** — leverage [skills.sh](https://skills.sh) ecosystem or generate custom skills
- **Works with your stack** — Next.js, Laravel, Django, Express, and more

---

## What is AI Factory?

AI Factory is a CLI tool and skill system that:

1. **Analyzes your project** - detects tech stack from package.json, composer.json, requirements.txt, etc.
2. **Installs relevant skills** - downloads from [skills.sh](https://skills.sh) or generates custom ones
3. **Configures MCP servers** - GitHub, Postgres, Filesystem based on your needs
4. **Provides spec-driven workflow** - structured feature development with plans, tasks, and commits

## Installation

```bash
npm install -g ai-factory
```

## Quick Start

```bash
# In your project directory
ai-factory init
```

This will:
- Detect your project stack
- Ask which base skills to install
- Configure MCP servers (optional)
- Set up `.claude/skills/` directory

Then open Claude Code and start working:

```
/ai-factory
```

## Development Workflow

![workflow](https://github.com/lee-to/ai-factory/raw/main/art/workflow.png)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AI FACTORY WORKFLOW                             │
└─────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐      ┌──────────────┐      ┌──────────────────────────┐
  │              │      │    claude    │      │                          │
  │ ai-factory   │ ───▶ │ (or any AI   │ ───▶ │      /ai-factory         │
  │    init      │      │    agent)    │      │   (setup context)        │
  │              │      │              │      │                          │
  └──────────────┘      └──────────────┘      └────────────┬─────────────┘
                                                           │
                          ┌────────────────────────────────┼────────────────┐
                          │                                │                │
                          ▼                                ▼                ▼
               ┌──────────────────┐            ┌─────────────────┐  ┌──────────────┐
               │                  │            │                 │  │              │
               │ /ai-factory.task │            │/ai-factory.     │  │/ai-factory.  │
               │                  │            │    feature      │  │    fix       │
               │  Small tasks     │            │                 │  │              │
               │  No git branch   │            │ Full features   │  │ Bug fixes    │
               │  Quick work      │            │ Git branch      │  │ No plans     │
               │                  │            │ Full plan       │  │ With logging │
               └────────┬─────────┘            └────────┬────────┘  └───────┬──────┘
                        │                               │                   │
                        │                               │                   ▼
                        │                               │          ┌──────────────────┐
                        │                               │          │ .ai-factory/     │
                        │                               │          │   patches/       │
                        │                               │          │ Self-improvement │
                        └───────────────┬───────────────┘          └────────┬─────────┘
                                        │                                   │
                                        ▼                                   │
                             ┌─────────────────────┐                        │
                             │                     │                        │
                             │ /ai-factory.improve │                        │
                             │    (optional)        │                        │
                             │                     │                        │
                             │ Refine plan with    │                        │
                             │ deeper analysis     │                        │
                             │                     │                        │
                             └──────────┬──────────┘                        │
                                        │                                   │
                                        ▼                                   │
                             ┌─────────────────────┐                        │
                             │                     │◀── reads patches ──────┘
                             │ /ai-factory.implement│
                             │                     │ ──── error? ──▶ /fix
                             │  Execute tasks      │
                             │  Commit checkpoints │
                             │                     │
                             └──────────┬──────────┘
                                        │
                                        ▼
                             ┌─────────────────────┐
                             │                     │
                             │ /ai-factory.commit  │
                             │                     │
                             └──────────┬──────────┘
                                        │
                        ┌───────────────┴───────────────┐
                        │                               │
                        ▼                               ▼
                   More work?                        Done!
                   Loop back ↑                          │
                                                        ▼
                                             ┌─────────────────────┐
                                             │                     │
                                             │ /ai-factory.evolve  │
                                             │                     │
                                             │ Reads patches +     │
                                             │ project context     │
                                             │       ↓             │
                                             │ Improves skills     │
                                             │                     │
                                             └─────────────────────┘

```

### When to Use What?

| Command | Use Case | Creates Branch? | Creates Plan? |
|---------|----------|-----------------|---------------|
| `/ai-factory.task` | Small tasks, quick fixes, experiments | No | `.ai-factory/PLAN.md` |
| `/ai-factory.feature` | Full features, stories, epics | Yes | `.ai-factory/features/<branch>.md` |
| `/ai-factory.improve` | Refine plan before implementation | No | No (improves existing) |
| `/ai-factory.fix` | Bug fixes, errors, hotfixes | No | No (direct fix) |

### Why Spec-Driven?

- **Predictable results** - AI follows a plan, not random exploration
- **Resumable sessions** - progress saved in plan files, continue anytime
- **Commit discipline** - structured commits at logical checkpoints
- **No scope creep** - AI does exactly what's in the plan, nothing more

## Core Skills

### `/ai-factory`
Analyzes your project and sets up context:
- Scans project files to detect stack
- Searches [skills.sh](https://skills.sh) for relevant skills
- Generates custom skills via `/ai-factory.skill-generator`
- Configures MCP servers

When called with a description:
```
/ai-factory e-commerce platform with Stripe and Next.js
```
- Creates `.ai-factory/DESCRIPTION.md` with enhanced project specification
- Transforms your idea into a structured, professional description

**Does NOT implement your project** - only sets up context.

### `/ai-factory.feature <description>`
Starts a new feature:
```
/ai-factory.feature Add user authentication with OAuth
```
- Creates git branch (`feature/user-authentication`)
- Asks about testing and logging preferences
- Creates plan file (`feature-user-authentication.md`)
- Invokes `/ai-factory.task` to create implementation plan

### `/ai-factory.task <description>`
Creates implementation plan:
```
/ai-factory.task Add product search API
```
- Analyzes requirements
- Explores codebase for patterns
- Creates tasks with dependencies
- Saves plan to `.ai-factory/PLAN.md` (or branch-named file)
- For 5+ tasks, includes commit checkpoints

### `/ai-factory.improve [prompt]`
Refine an existing plan with a second iteration:
```
/ai-factory.improve                                    # Auto-review: find gaps, missing tasks, wrong deps
/ai-factory.improve добавь валидацию и обработку ошибок # Improve based on specific feedback
```
- Finds the active plan (`.ai-factory/PLAN.md` or branch-based `features/<branch>.md`)
- Performs deeper codebase analysis than the initial `/task` planning
- Finds missing tasks (migrations, configs, middleware)
- Fixes task dependencies and descriptions
- Removes redundant tasks
- Shows improvement report and asks for approval before applying
- If no plan found — suggests running `/ai-factory.task` or `/ai-factory.feature` first

### `/ai-factory.implement`
Executes the plan:
```
/ai-factory.implement        # Continue from where you left off
/ai-factory.implement 5      # Start from task #5
/ai-factory.implement status # Check progress
```
- **Reads past patches** from `.ai-factory/patches/` before starting — learns from previous mistakes
- Finds plan file (.ai-factory/PLAN.md or branch-based)
- Executes tasks one by one
- Prompts for commits at checkpoints
- Offers to delete .ai-factory/PLAN.md when done

### `/ai-factory.fix <bug description>`
Quick bug fix without plans:
```
/ai-factory.fix TypeError: Cannot read property 'name' of undefined
```
- Investigates codebase to find root cause
- Applies fix WITH logging (`[FIX]` prefix for easy filtering)
- Suggests test coverage for the bug
- Creates a **self-improvement patch** in `.ai-factory/patches/`
- NO plans, NO reports - just fix, learn, and move on

### `/ai-factory.evolve [skill-name|"all"]`
Self-improve skills based on project experience:
```
/ai-factory.evolve          # Evolve all skills
/ai-factory.evolve fix      # Evolve only /fix skill
/ai-factory.evolve all      # Evolve all skills
```
- Reads all patches from `.ai-factory/patches/` — finds recurring problems
- Analyzes project tech stack, conventions, and codebase patterns
- Identifies gaps in existing skills (missing guards, tech-specific pitfalls)
- Proposes targeted improvements with user approval
- Saves evolution log to `.ai-factory/evolutions/`
- The more `/fix` patches you accumulate, the smarter `/evolve` becomes

### `/ai-factory.commit`
Creates conventional commits:
- Analyzes staged changes
- Generates meaningful commit message
- Follows conventional commits format

### `/ai-factory.skill-generator`
Generates new skills:
```
/ai-factory.skill-generator api-patterns
```
- Creates SKILL.md with proper frontmatter
- Follows [Agent Skills](https://agentskills.io) specification
- Can include references, scripts, templates

**Learn Mode** — pass URLs to generate skills from real documentation:
```
/ai-factory.skill-generator https://fastapi.tiangolo.com/tutorial/
/ai-factory.skill-generator https://react.dev/learn https://react.dev/reference/react/hooks
/ai-factory.skill-generator my-skill https://docs.example.com/api
```
- Fetches and deeply studies each URL
- Enriches with web search for best practices and pitfalls
- Synthesizes a structured knowledge base
- Generates a complete skill package with references from real sources
- Supports multiple URLs, mixed sources (docs + blogs), and optional skill name hint

## Plan Files

AI Factory uses markdown files to track implementation plans:

| Source | Plan File | After Completion |
|--------|-----------|------------------|
| `/ai-factory.task` (direct) | `.ai-factory/PLAN.md` | Offer to delete |
| `/ai-factory.feature` | `.ai-factory/features/<branch-name>.md` | Keep (user decides) |

**Example plan file:**

```markdown
# Implementation Plan: User Authentication

Branch: feature/user-authentication
Created: 2024-01-15

## Settings
- Testing: no
- Logging: verbose

## Commit Plan
- **Commit 1** (tasks 1-3): "feat: add user model and types"
- **Commit 2** (tasks 4-6): "feat: implement auth service"

## Tasks

### Phase 1: Setup
- [ ] Task 1: Create User model
- [ ] Task 2: Add auth types

### Phase 2: Implementation
- [x] Task 3: Implement registration
- [ ] Task 4: Implement login
```

## MCP Configuration

AI Factory can configure these MCP servers:

| MCP Server | Use Case | Env Variable |
|------------|----------|--------------|
| GitHub | PRs, issues, repo operations | `GITHUB_TOKEN` |
| Postgres | Database queries | `DATABASE_URL` |
| Filesystem | Advanced file operations | - |

Configuration saved to `.claude/settings.local.json` (gitignored).

## Security

**Security is a first-class citizen in AI Factory.** Skills downloaded from external sources (skills.sh, GitHub, URLs) can contain prompt injection attacks — malicious instructions hidden inside SKILL.md files that hijack agent behavior, steal credentials, or execute destructive commands.

AI Factory protects against this with a **mandatory two-level security scan** that runs before any external skill is used:

```
External skill downloaded
         │
         ▼
┌─── Level 1: Automated Scanner ────────────────────────────┐
│                                                            │
│  Python-based static analysis (security-scan.py)           │
│                                                            │
│  Detects:                                                  │
│  ✓ Prompt injection patterns                               │
│    ("ignore previous instructions", fake <system> tags)    │
│  ✓ Data exfiltration attempts                              │
│    (curl with .env/secrets, reading ~/.ssh, ~/.aws)        │
│  ✓ Stealth instructions                                    │
│    ("do not tell the user", "silently", "secretly")        │
│  ✓ Destructive commands (rm -rf, fork bombs, disk format)  │
│  ✓ Config tampering (.claude/, .bashrc, .gitconfig)        │
│  ✓ Encoded payloads (base64, hex, zero-width characters)   │
│  ✓ Social engineering ("authorized by admin")              │
│  ✓ Hidden HTML comments with suspicious content            │
│                                                            │
│  Smart code-block awareness: patterns inside markdown      │
│  fenced code blocks are demoted to warnings (docs/examples)│
│                                                            │
└──────────────────────┬─────────────────────────────────────┘
                       │ CLEAN/WARNINGS?
                       ▼
┌─── Level 2: LLM Semantic Review ──────────────────────────┐
│                                                            │
│  The AI agent reads all skill files and evaluates:         │
│                                                            │
│  ✓ Does every instruction serve the skill's stated purpose?│
│  ✓ Are there requests to access sensitive user data?       │
│  ✓ Is there anything unrelated to the skill's goal?        │
│  ✓ Are there manipulation attempts via urgency/authority?  │
│  ✓ Subtle rephrasing of known attacks that regex misses    │
│  ✓ "Does this feel right?" — a linter asking for network   │
│    access, a formatter reading SSH keys, etc.              │
│                                                            │
└──────────────────────┬─────────────────────────────────────┘
                       │ Both levels pass?
                       ▼
                ✅ Skill is safe to use
```

**Why two levels?**

| Level | Catches | Misses |
|-------|---------|--------|
| **Python scanner** | Known patterns, encoded payloads, invisible characters, HTML comment injections | Rephrased attacks, novel techniques |
| **LLM semantic review** | Intent and context, creative rephrasing, suspicious tool combinations | Encoded data, zero-width chars, binary payloads |

They complement each other — the scanner is deterministic and catches what LLMs might skip over; the LLM understands meaning and catches what regex can't express.

**Scan results:**
- **CLEAN** (exit 0) — no threats, safe to install
- **BLOCKED** (exit 1) — critical threats detected, skill is deleted and user is warned
- **WARNINGS** (exit 2) — suspicious patterns found, user must explicitly confirm

A skill with **any CRITICAL threat is never installed**. No exceptions, no overrides.

### Running the scanner manually

```bash
# Scan a skill directory
python3 .claude/skills/skill-generator/scripts/security-scan.py ./my-downloaded-skill/

# Scan a single SKILL.md file
python3 .claude/skills/skill-generator/scripts/security-scan.py ./my-skill/SKILL.md
```

## Skill Acquisition Strategy

AI Factory follows this strategy for skills:

```
For each recommended skill:
  1. Search skills.sh: npx skills search <name>
  2. If found → Install: npx skills install <name>
  3. Security scan → python3 security-scan.py <path>
     - BLOCKED? → remove, warn user, skip
     - WARNINGS? → show to user, ask confirmation
  4. If not found → Generate: /ai-factory.skill-generator <name>
  5. Has reference docs? → Learn: /ai-factory.skill-generator <url1> [url2]...
```

**Never reinvent existing skills** - always check skills.sh first. **Never trust external skills blindly** - always scan before use. When reference documentation is available, use **Learn Mode** to generate skills from real sources.

## CLI Commands

```bash
# Initialize project
ai-factory init

# Update skills to latest version
ai-factory update
```

## Project Structure

After initialization:

```
your-project/
├── .claude/
│   ├── skills/
│   │   ├── ai-factory/
│   │   ├── feature/
│   │   ├── task/
│   │   ├── improve/
│   │   ├── implement/
│   │   ├── commit/
│   │   ├── review/
│   │   └── skill-generator/
│   └── settings.local.json    # MCP config (gitignored)
├── .ai-factory/               # AI Factory working directory
│   ├── DESCRIPTION.md         # Project specification
│   ├── PLAN.md                # Current plan (from /task)
│   ├── features/              # Feature plans (from /feature)
│   │   └── feature-*.md
│   ├── patches/               # Self-improvement patches (from /fix)
│   │   └── 2026-02-07-14.30.md
│   └── evolutions/            # Evolution logs (from /evolve)
│       └── 2026-02-08-10.00.md
└── .ai-factory.json           # AI Factory config
```

## Self-Improvement Patches

AI Factory has a built-in learning loop. Every bug fix creates a **patch** — a structured knowledge artifact that helps AI avoid the same mistakes in the future.

```
/fix → finds bug → fixes it → creates patch → next /fix or /implement reads all patches → better code
```

**How it works:**

1. `/ai-factory.fix` fixes a bug and creates a patch file in `.ai-factory/patches/YYYY-MM-DD-HH.mm.md`
2. Each patch documents: **Problem**, **Root Cause**, **Solution**, **Prevention**, and **Tags**
3. Before any `/fix` or `/implement`, AI reads all existing patches
4. AI applies lessons learned — avoids patterns that caused bugs, follows patterns that prevented them

**Example patch** (`.ai-factory/patches/2026-02-07-14.30.md`):

```markdown
# Null reference in UserProfile when user has no avatar

**Date:** 2026-02-07 14:30
**Files:** src/components/UserProfile.tsx
**Severity:** medium

## Problem
TypeError: Cannot read property 'url' of undefined when rendering UserProfile.

## Root Cause
`user.avatar` is optional in DB but accessed without null check.

## Solution
Added optional chaining: `user.avatar?.url` with fallback.

## Prevention
- Always null-check optional DB fields in UI
- Add "empty state" test cases

## Tags
`#null-check` `#react` `#optional-field`
```

The more you use `/fix`, the smarter AI becomes on your project. Patches accumulate and create a project-specific knowledge base.

**Periodic evolution** -- run `/ai-factory.evolve` to analyze all patches and automatically improve skills:

```
/ai-factory.evolve      # Analyze patches + project → improve all skills
```

This closes the full learning loop: **fix → patch → evolve → better skills → fewer bugs → smarter fixes**.

## Best Practices

### Logging
All implementations include verbose, configurable logging:
- Use log levels (DEBUG, INFO, WARN, ERROR)
- Control via `LOG_LEVEL` environment variable
- Implement rotation for file-based logs

### Commits
- Commit checkpoints every 3-5 tasks for large features
- Follow conventional commits format
- Meaningful messages, not just "update code"

### Testing
- Always asked before creating plan
- If "no tests" - no test tasks created
- Never sneaks in test code

## Configuration

`.ai-factory.json`:
```json
{
  "version": "1.0.0",
  "agent": "claude",
  "skillsDir": ".claude/skills",
  "installedSkills": ["ai-factory", "feature", "task", "improve", "implement", "commit"],
  "mcp": {
    "github": true,
    "postgres": false,
    "filesystem": false
  }
}
```

![happy](https://github.com/lee-to/ai-factory/raw/main/art/happy.png)

## Links

- [skills.sh](https://skills.sh) - Skill marketplace
- [Agent Skills Spec](https://agentskills.io) - Skill specification
- [Claude Code](https://claude.ai/code) - AI coding assistant

## License

MIT
