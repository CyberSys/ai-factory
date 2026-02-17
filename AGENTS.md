# AI Factory - Developer Guide

> This file is for AI agents working on this codebase. Read this first when starting a new session.

## What is this project?

**AI Factory** is an npm package + skill system that automates Claude Code context setup for projects. It provides:

1. **CLI tool** (`ai-factory init/update`) - installs skills and configures MCP
2. **Built-in skills** - workflow commands for spec-driven development
3. **Spec-driven workflow** - structured approach: plan → implement → commit

## Project Structure

```
ai-factory/
├── src/                    # CLI source (TypeScript)
│   ├── cli/
│   │   ├── commands/       # init.ts, update.ts
│   │   └── wizard/         # prompts.ts, detector.ts
│   ├── core/               # installer.ts, config.ts, mcp.ts
│   └── utils/              # fs.ts
├── skills/                 # Built-in skills (copied to user projects)
│   ├── ai-factory/         # Main setup skill
│   ├── feature/            # Start feature (branch + plan)
│   ├── task/               # Create implementation plan
│   ├── implement/          # Execute plan tasks
│   ├── fix/                # Quick bug fixes (no plans)
│   ├── evolve/             # Self-improve skills based on context
│   ├── commit/             # Conventional commits
│   ├── docs/               # Documentation generation & maintenance
│   ├── review/             # Code review
│   ├── deploy/             # Deployment helper
│   ├── skill-generator/    # Generate new skills
│   ├── best-practices/     # Code quality guidelines
│   ├── architecture/       # Architecture patterns
│   ├── security-checklist/ # Security audit
│   └── _templates/         # Stack-specific templates
├── dist/                   # Compiled JS
└── bin/                    # CLI entry point
```

## Key Concepts

### Skills Location
- **Package skills**: `skills/` - source of truth, copied during install
- **User skills**: `.claude/skills/` (Claude Code), `.opencode/skills/` (OpenCode), or `.agents/skills/` (universal)

### Working Directory
All AI Factory files in user projects go to `.ai-factory/`:
- `.ai-factory/DESCRIPTION.md` - project specification
- `.ai-factory/ARCHITECTURE.md` - architecture decisions and guidelines
- `.ai-factory/PLAN.md` - task plan (from /ai-factory-task)
- `.ai-factory/features/feature-*.md` - feature plans (from /ai-factory-feature)

### Skill Naming
All skills use `ai-factory-` prefix:
- `/ai-factory` - main setup
- `/ai-factory-feature`
- `/ai-factory-task`
- `/ai-factory-implement`
- `/ai-factory-commit`
- `/ai-factory-docs`
- etc.

## Workflow Logic

```
/ai-factory (3 scenarios)
    ↓
Check: has arguments? has project files?
    ↓
┌─────────────────────────────────────────────────────────────┐
│ Mode 1: Existing project (no args + has package.json, etc.) │
│   → Analyze project → Generate DESCRIPTION.md → Setup       │
├─────────────────────────────────────────────────────────────┤
│ Mode 2: New project with description                        │
│   → Interactive stack selection → DESCRIPTION.md → Setup    │
├─────────────────────────────────────────────────────────────┤
│ Mode 3: Empty project (no args + no config files)           │
│   → Ask "What are you building?" → Stack selection → Setup  │
└─────────────────────────────────────────────────────────────┘
    ↓
/ai-factory-architecture → Generate ARCHITECTURE.md
    ↓
STOP (does NOT implement)

/ai-factory-feature <description>
    ↓
Reads .ai-factory/DESCRIPTION.md + ARCHITECTURE.md for context
    ↓
Creates git branch (feature/xxx)
    ↓
Asks: tests? logging level?
    ↓
Calls /ai-factory-task → creates .ai-factory/features/feature-xxx.md

/ai-factory-task <description>
    ↓
Reads .ai-factory/DESCRIPTION.md + ARCHITECTURE.md for context
    ↓
Explores codebase
    ↓
Creates tasks with TaskCreate
    ↓
Saves plan to .ai-factory/PLAN.md (direct) or .ai-factory/features/feature-xxx.md (from feature)
    ↓
For 5+ tasks: includes commit checkpoints

/ai-factory-implement
    ↓
Reads .ai-factory/DESCRIPTION.md + ARCHITECTURE.md for context
    ↓
Finds plan file (PLAN.md or branch-named)
    ↓
Executes tasks one by one
    ↓
Updates DESCRIPTION.md if stack changes
    ↓
Prompts for commits at checkpoints
    ↓
Offers to delete PLAN.md when done (keeps feature-*.md)

/ai-factory-fix <bug description>
    ↓
Reads .ai-factory/DESCRIPTION.md + patches for context
    ↓
Investigates codebase (Glob, Grep, Read)
    ↓
Implements fix WITH logging ([FIX] prefix)
    ↓
Suggests test coverage for the bug
    ↓
Creates self-improvement patch in .ai-factory/patches/
    ↓
NO plans, NO reports

/ai-factory-evolve [skill-name|"all"]
    ↓
Reads .ai-factory/DESCRIPTION.md + all patches
    ↓
Analyzes recurring patterns and tech-specific pitfalls
    ↓
Reads current skills → identifies gaps
    ↓
Proposes targeted improvements → user approves
    ↓
Applies improvements to skills
    ↓
Saves evolution log to .ai-factory/evolutions/
```

## Skill Frontmatter Patterns

### Action skills (user-only)
```yaml
disable-model-invocation: true  # User must invoke explicitly
allowed-tools: Bash(git *) Write Edit
```
Used by: feature, task, implement, commit, deploy

### Reference skills (model + user)
```yaml
# No disable-model-invocation - Claude can use automatically
allowed-tools: Read Glob Grep
```
Used by: best-practices, architecture, security-checklist, review

## Development Commands

```bash
# Build TypeScript
npm run build

# Link globally for testing
npm link

# Test in a project
cd /some/project
ai-factory init

# Update skills after changes
ai-factory update
```

## Key Files to Know

| File | Purpose |
|------|---------|
| `src/cli/wizard/prompts.ts` | Interactive CLI questions |
| `src/cli/wizard/detector.ts` | Stack detection logic |
| `src/core/installer.ts` | Copies skills to project |
| `src/core/mcp.ts` | MCP server configuration |
| `skills/*/SKILL.md` | Skill instructions |

## Important Rules

1. **Skills don't implement** - `/ai-factory` only sets up context
2. **DESCRIPTION.md is source of truth** - all skills read it for context
3. **Plans go to .ai-factory/** - keeps project root clean
4. **Search skills.sh first** - don't reinvent existing skills
5. **Verbose logging required** - all implementations must have configurable logging
6. **No tests unless asked** - respect user's testing preference
7. **Commit checkpoints** - for plans with 5+ tasks
8. **ARCHITECTURE.md is architecture source of truth** - all skills follow its folder structure and dependency rules

## Documentation Structure

User-facing documentation is split between a lean README and detailed `docs/` pages:

```
README.md                    # Landing page (~105 lines) — first impression, install, example workflow
docs/
├── getting-started.md       # What is AI Factory, supported agents table, first project walkthrough, CLI
├── workflow.md              # Workflow diagram, "When to Use What" table, workflow skills overview
├── skills.md                # Full reference: Workflow Skills + Utility Skills
├── plan-files.md            # Plan files, self-improvement patches, skill acquisition strategy
├── security.md              # Two-level security scanning system
└── configuration.md         # .ai-factory.json, MCP config, project structure, best practices
```

### Principles

1. **README is a landing page, not a manual.** It should contain: logo, tagline, "Why?", install, quick start, example workflow, documentation links table, external links, license. Nothing else.
2. **Details go to `docs/`.** Each file is self-contained — one topic, one page. A user should be able to read a single doc file and get the full picture on that topic.
3. **No duplication.** If information lives in `docs/`, README links to it — does not repeat it. The only exception: installation command appears in both README and `docs/getting-started.md` (users expect it in README).
4. **Navigation.** Every docs/ file starts with `[← Back to README](../README.md)` and ends with a "See Also" section linking to 2-3 related pages. `getting-started.md` has "Next Steps" instead.
5. **Workflow skills vs utility skills.** `docs/workflow.md` describes the 6 workflow skills (feature, task, improve, implement, fix, evolve) with concise 1-paragraph overviews. `docs/skills.md` has the full reference for ALL skills, split into "Workflow Skills" and "Utility Skills" sections.
6. **Cross-links use relative paths.** From README: `docs/workflow.md`. Between docs: `workflow.md` (same directory).

### When to Update What

| Change | Update |
|--------|--------|
| New skill added | `docs/skills.md` (add to appropriate section), `docs/workflow.md` (if it's a workflow skill), README Documentation table description (if skill count text changes) |
| New agent added | `docs/getting-started.md` (agents table), README (agent name in "Multi-agent support" bullet) |
| Workflow logic changed | `docs/workflow.md` (diagram + skill descriptions), `docs/skills.md` (detailed reference) |
| New config option | `docs/configuration.md` |
| Security scanning changed | `docs/security.md` |
| Plan file format changed | `docs/plan-files.md` |
| New CLI command | `docs/getting-started.md` (CLI Commands section) |
| Documentation conventions changed | `skills/docs/SKILL.md` (principles and templates) |

## Common Changes

### Adding a new skill
1. Create `skills/new-skill/SKILL.md`
2. Add to `getAvailableSkills()` if needed
3. Rebuild: `npm run build`

### Modifying workflow
1. Edit relevant skill in `skills/`
2. Update AGENTS.md if logic changes
3. Rebuild and test with `ai-factory update`

### Adding a new agent

To add support for a new AI coding agent:

1. **`src/core/agents.ts`** — add entry to `AGENT_REGISTRY`:
   ```ts
   newagent: {
     id: 'newagent',
     displayName: 'New Agent',
     configDir: '.newagent',          // where agent stores config
     skillsDir: '.newagent/skills',   // where skills are installed
     settingsFile: null,              // path to MCP settings file (null = no MCP)
     supportsMcp: false,              // true if agent supports MCP servers
   },
   ```
   - `settingsFile` is relative to project root (e.g. `.claude/settings.local.json`, `opencode.json`)
   - Set `supportsMcp: true` + provide `settingsFile` to enable MCP auto-configuration

2. **`src/core/mcp.ts`** — only if MCP format differs from Claude/Cursor standard:
   - Standard format: `{ mcpServers: { name: { command, args, env } } }`
   - If the agent uses a different structure (like OpenCode uses `{ mcp: { name: { type, command[], environment } } }`), add a branch in `configureMcp()` with format conversion
   - If MCP format matches standard — no changes needed

3. **Documentation** — update:
   - `docs/getting-started.md` — Supported Agents table
   - `docs/configuration.md` — MCP support mention (if applicable), agent ID in `.ai-factory.json` docs
   - `README.md` — agent name in "Multi-agent support" bullet, Links section

4. **`AGENTS.md`** — update Skills Location example if helpful

5. **`package.json`** — add agent name to `keywords`

6. **Build & test**: `npm run build && ai-factory init` — select the new agent, verify skills copy to correct dir and MCP config (if any) writes correct format

Template variables (`{{config_dir}}`, `{{skills_dir}}`, etc.) in skill `.md` files are substituted automatically by `src/core/template.ts` — no changes needed there.

### Changing CLI prompts
1. Edit `src/cli/wizard/prompts.ts`
2. Update types in `src/core/config.ts` if needed
3. Rebuild: `npm run build`

## Testing Checklist

After changes, verify:
- [ ] `ai-factory init` works in empty directory
- [ ] `ai-factory update` updates existing skills
- [ ] `/ai-factory` in Claude Code shows interactive stack selection
- [ ] `/ai-factory-feature` creates branch + plan file
- [ ] `/ai-factory-implement` finds and executes plan
- [ ] Skills read `.ai-factory/DESCRIPTION.md`
