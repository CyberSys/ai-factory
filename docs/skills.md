[← Development Workflow](workflow.md) · [Back to README](../README.md) · [Plan Files →](plan-files.md)

# Core Skills

## Workflow Skills

These skills form the core development loop. See [Development Workflow](workflow.md) for the full diagram and how they connect.

### `/ai-factory-feature <description>`
Starts a new feature:
```
/ai-factory-feature Add user authentication with OAuth
```
- Creates git branch (`feature/user-authentication`)
- Asks about testing, logging, and documentation preferences
- Creates plan file (`feature-user-authentication.md`)
- Invokes `/ai-factory-task` to create implementation plan

**Parallel mode** — work on multiple features simultaneously using `git worktree`:
```
/ai-factory-feature --parallel Add Stripe checkout
```
- Creates a separate working directory (`../my-project-feature-stripe-checkout`)
- Copies AI context files (`.ai-factory/`, `.claude/`, `CLAUDE.md`)
- Each feature gets its own Claude Code session — no branch switching, no conflicts

**Manage parallel features:**
```
/ai-factory-feature --list                          # Show all active worktrees
/ai-factory-feature --cleanup feature/stripe-checkout # Remove worktree and branch
```

### `/ai-factory-roadmap [check | vision or requirements]`
Creates or updates a strategic project roadmap:
```
/ai-factory-roadmap                              # Analyze project and create roadmap
/ai-factory-roadmap SaaS for project management  # Create roadmap from vision
/ai-factory-roadmap                              # Update existing roadmap (interactive)
/ai-factory-roadmap check                        # Auto-scan codebase, mark done milestones
```
- Reads `.ai-factory/DESCRIPTION.md` + `ARCHITECTURE.md` for context
- **First run** — explores codebase, asks for major goals, generates `.ai-factory/ROADMAP.md`
- **Subsequent runs** — review progress, add milestones, reprioritize, mark completed
- **`check`** — automated progress scan: analyzes codebase for evidence of completed milestones, reports done/partial/not started, marks completed with confirmation
- Milestones are high-level goals (not granular tasks — that's `/ai-factory-task`)
- `/ai-factory-implement` automatically marks roadmap milestones done when work completes

### `/ai-factory-task <description>`
Creates implementation plan:
```
/ai-factory-task Add product search API
```
- Analyzes requirements
- Explores codebase for patterns
- Creates tasks with dependencies
- Saves plan to `.ai-factory/PLAN.md` (or branch-named file)
- For 5+ tasks, includes commit checkpoints

### `/ai-factory-improve [prompt]`
Refine an existing plan with a second iteration:
```
/ai-factory-improve                                    # Auto-review: find gaps, missing tasks, wrong deps
/ai-factory-improve добавь валидацию и обработку ошибок # Improve based on specific feedback
```
- Finds the active plan (`.ai-factory/PLAN.md` or branch-based `features/<branch>.md`)
- Performs deeper codebase analysis than the initial `/ai-factory-task` planning
- Finds missing tasks (migrations, configs, middleware)
- Fixes task dependencies and descriptions
- Removes redundant tasks
- Shows improvement report and asks for approval before applying
- If no plan found — suggests running `/ai-factory-task` or `/ai-factory-feature` first

### `/ai-factory-implement`
Executes the plan:
```
/ai-factory-implement        # Continue from where you left off
/ai-factory-implement 5      # Start from task #5
/ai-factory-implement status # Check progress
```
- **Reads past patches** from `.ai-factory/patches/` before starting — learns from previous mistakes
- Finds plan file (.ai-factory/PLAN.md or branch-based)
- Executes tasks one by one
- Prompts for commits at checkpoints
- If plan has `Docs: yes` — runs `/ai-factory-docs` after completion
- Offers to delete .ai-factory/PLAN.md when done

### `/ai-factory-verify [--strict]`
Verifies completed implementation against the plan:
```
/ai-factory-verify          # Check all tasks were fully implemented
/ai-factory-verify --strict # Strict mode — zero tolerance before merge
```

**Optional step after `/ai-factory-implement`** — when implementation finishes, you'll be asked if you want to verify.

- **Task completion audit** — goes through every task in the plan, uses `Glob`/`Grep`/`Read` to confirm the code actually implements each requirement. Reports `COMPLETE`, `PARTIAL`, or `NOT FOUND` per task
- **Build & test check** — runs the project's build command, test suite, and linters on changed files
- **Consistency checks** — searches for leftover `TODO`/`FIXME`/`HACK`, undocumented environment variables, missing dependencies, plan-vs-code naming drift
- **Auto-fix** — if issues found, offers to fix them immediately or accept as-is
- **Follow-up suggestions** — after verification, suggests running `/ai-factory-security-checklist` and `/ai-factory-review`

**Strict mode** (`--strict`) is recommended before merging: requires all tasks complete, build passing, tests passing, lint clean, zero TODOs in changed files.

### `/ai-factory-fix [bug description]`
Bug fix with optional plan-first mode:
```
/ai-factory-fix TypeError: Cannot read property 'name' of undefined
```
- Asks to choose mode: **Fix now** (immediate) or **Plan first** (review before fixing)
- Investigates codebase to find root cause
- Applies fix WITH logging (`[FIX]` prefix for easy filtering)
- Suggests test coverage for the bug
- Creates a **self-improvement patch** in `.ai-factory/patches/`

**Plan-first mode** — for complex bugs or when you want to review the approach:
```
/ai-factory-fix Something is broken    # Choose "Plan first" when asked
```
- Investigates the codebase, creates `.ai-factory/FIX_PLAN.md` with analysis, fix steps, risks
- Stops after creating the plan — you review it at your own pace
- When ready, run without arguments to execute the plan:
```
/ai-factory-fix                        # Detects FIX_PLAN.md, executes the fix, deletes the plan
```

### `/ai-factory-evolve [skill-name|"all"]`
Self-improve skills based on project experience:
```
/ai-factory-evolve          # Evolve all skills
/ai-factory-evolve fix      # Evolve only /ai-factory-fix skill
/ai-factory-evolve all      # Evolve all skills
```
- Reads all patches from `.ai-factory/patches/` — finds recurring problems
- Analyzes project tech stack, conventions, and codebase patterns
- Identifies gaps in existing skills (missing guards, tech-specific pitfalls)
- Proposes targeted improvements with user approval
- Saves evolution log to `.ai-factory/evolutions/`
- The more `/ai-factory-fix` patches you accumulate, the smarter `/ai-factory-evolve` becomes

---

## Utility Skills

### `/ai-factory`
Analyzes your project and sets up context:
- Scans project files to detect stack
- Searches [skills.sh](https://skills.sh) for relevant skills
- Generates custom skills via `/ai-factory-skill-generator`
- Configures MCP servers
- Generates architecture document via `/ai-factory-architecture`

When called with a description:
```
/ai-factory e-commerce platform with Stripe and Next.js
```
- Creates `.ai-factory/DESCRIPTION.md` with enhanced project specification
- Creates `.ai-factory/ARCHITECTURE.md` with architecture decisions and guidelines
- Transforms your idea into a structured, professional description

**Does NOT implement your project** - only sets up context.

### `/ai-factory-architecture [clean|ddd|microservices|monolith|layers]`
Generates architecture guidelines tailored to your project:
```
/ai-factory-architecture           # Analyze project and recommend
/ai-factory-architecture clean     # Use Clean Architecture
/ai-factory-architecture monolith  # Use Modular Monolith
```
- Reads `.ai-factory/DESCRIPTION.md` for project context
- Recommends architecture pattern based on team size, domain complexity, and tech stack
- Generates `.ai-factory/ARCHITECTURE.md` with folder structure, dependency rules, code examples
- All examples adapted to your project's language and framework
- Called automatically by `/ai-factory` during setup, but can also be used standalone

### `/ai-factory-docs [--web]`
Generates and maintains project documentation:
```
/ai-factory-docs          # Generate or improve documentation
/ai-factory-docs --web    # Also generate HTML version in docs-html/
```

**Smart detection** — adapts to your project's current state:
- **No README?** — analyzes your codebase and creates a lean README (~100 lines) as a landing page + `docs/` directory with topic pages
- **Long README?** — proposes splitting into a landing-page README with detailed content moved to `docs/`
- **Docs exist?** — audits for stale content, broken links, missing topics, and outdated formatting

**Scattered .md cleanup** — finds loose markdown files in your project root (CONTRIBUTING.md, ARCHITECTURE.md, SETUP.md, DEPLOYMENT.md, etc.) and proposes consolidating them into a structured `docs/` directory. No more documentation scattered across 10 root-level files.

**Stays in sync with your code** — when `/ai-factory-feature` asks "Update documentation?" and you say yes, the plan gets `Docs: yes`. After `/ai-factory-implement` finishes all tasks, it automatically runs `/ai-factory-docs` to update documentation. Your docs grow with your codebase, not after the fact.

**Documentation website** — `--web` flag generates a complete static HTML site in `docs-html/` with navigation bar, dark mode support, and clean typography. Ready to host on GitHub Pages or any static hosting.

**Quality checks:**
- Every docs/ page gets prev/next navigation header + "See Also" cross-links
- Technical review — verifies links, structure, code examples, no content loss
- Readability review — "new user eyes" checklist: is it clear, scannable, jargon-free?

### `/ai-factory-dockerize [--audit]`
Generates, enhances, or audits Docker configuration for your project:
```
/ai-factory-dockerize          # Auto-detect mode based on existing files
/ai-factory-dockerize --audit  # Force audit mode on existing Docker files
```

**Three modes** (auto-detected):
1. **Generate** — no Docker files exist → interactive setup (choose DB, reverse proxy, cache), then create everything from scratch
2. **Enhance** — only local Docker exists (no production files) → audit & improve local, then create production config with deploy scripts
3. **Audit** — full Docker setup exists → run security checklist, fix gaps, add missing best practices

**Generated file structure:**
- Root: `Dockerfile`, `compose.yml`, `compose.override.yml`, `compose.production.yml`, `.dockerignore`, `.env.example` — only files Docker expects by convention
- `docker/` — service configs (angie/, postgres/, php/, redis/) — only directories that are needed
- `deploy/scripts/` — 6 production ops scripts: deploy, update, logs, health-check, rollback, backup (with tiered retention)

**Interactive setup** — when generating from scratch, asks about infrastructure: database (PostgreSQL, MySQL, MongoDB), reverse proxy (Angie preferred over Nginx, Traefik), cache (Redis, Memcached), queue (RabbitMQ).

**Security audit** — production checklist (OWASP Docker Security Cheat Sheet):
- Container isolation (read-only, no-new-privileges, cap_drop, non-root, tmpfs)
- Port exposure (no ports on infrastructure in prod, only proxy exposes 80/443)
- Network security (internal backend, no host networking, no Docker socket)
- Health checks on every service, log rotation, stdout/stderr logging
- Resource limits (CPU, memory, PIDs), secrets management, image pinning
- Over-engineering check (don't add services the code doesn't use)

After completion, suggests `/ai-factory-build-automation` and `/ai-factory-docs`.

Supports Go, Node.js, Python, and PHP with framework-specific configurations.

### `/ai-factory-build-automation [makefile|taskfile|justfile|mage]`
Generates or enhances build automation files:
```
/ai-factory-build-automation              # Auto-detect or ask which tool
/ai-factory-build-automation makefile     # Generate a Makefile
/ai-factory-build-automation taskfile     # Generate a Taskfile.yml
/ai-factory-build-automation justfile     # Generate a justfile
/ai-factory-build-automation mage         # Generate a magefile.go
```

**Two modes — generate or enhance:**
- **No build file exists?** — analyzes your project (language, framework, package manager, Docker, DB, linters) and generates a complete, best-practice build file from scratch
- **Build file already exists?** — scans for gaps (missing targets, no help command, no Docker targets despite Dockerfile, missing preamble) and enhances it surgically, preserving your existing structure

**Docker-aware** — when Dockerfile or docker-compose is detected:
- Generates container lifecycle targets (`docker-build`, `docker-push`, `docker-logs`)
- Separates dev vs production (`docker-dev`, `docker-prod-build`)
- Adds `infra-up`/`infra-down` for dependency services (postgres, redis)
- Creates container-exec variants (`docker-test`, `docker-lint`, `docker-shell`) for Docker-first projects

**Post-generation integration:**
- Updates README and existing docs with quick command reference
- Suggests creating `AGENTS.md` with build commands for AI agents
- Finds and updates any markdown files that already list project commands

Supports Go, Node.js, Python, and PHP with framework-specific targets (Laravel artisan, Next.js, FastAPI, etc.).

### `/ai-factory-ci [github|gitlab] [--enhance]`
Generates, enhances, or audits CI/CD pipeline configuration:
```
/ai-factory-ci                   # Auto-detect platform and mode
/ai-factory-ci github            # Generate GitHub Actions workflow
/ai-factory-ci gitlab            # Generate GitLab CI pipeline
/ai-factory-ci --enhance         # Force enhance mode on existing CI
```

**Three modes** (auto-detected):
1. **Generate** — no CI config exists → asks which platform (GitHub/GitLab), optional features (security, coverage, matrix), then creates pipeline from scratch
2. **Enhance** — CI exists but incomplete → analyzes gaps (missing lint/SA/security jobs), adds missing jobs
3. **Audit** — full CI setup exists → audits against best practices, reports issues, fixes gaps

**One workflow per concern** — separate files, not a monolith:
- `lint.yml` — code-style, static analysis, rector (PHPStan, ESLint, Clippy, golangci-lint)
- `tests.yml` — test suite with optional matrix builds and service containers
- `build.yml` — compilation/bundling verification
- `security.yml` — dependency audit + dependency review (composer audit, govulncheck, cargo deny)

**Per-language tools detected automatically:**
- **PHP**: PHP-CS-Fixer/Pint/PHPCS, PHPStan/Psalm, Rector, PHPUnit/Pest
- **Python**: Ruff/Black+isort+Flake8, mypy, pytest, bandit (supports both uv and pip)
- **Node.js/TypeScript**: ESLint/Prettier/Biome, tsc, Jest/Vitest
- **Go**: golangci-lint, go test, govulncheck
- **Rust**: cargo fmt, clippy, cargo test, cargo audit/deny
- **Java**: Checkstyle/PMD/SpotBugs, JUnit, OWASP (Maven and Gradle)

**CI best practices** built-in:
- Concurrency groups, `fail-fast: false`, dependency caching per language
- GitLab: `policy: pull` on downstream jobs, codequality/junit report integration, DAG with `needs:`
- GitHub: explicit `permissions`, `actions/dependency-review-action` for PR security
- Service containers (PostgreSQL, Redis) when tests need external dependencies

After completion, suggests `/ai-factory-build-automation` and `/ai-factory-dockerize`.

### `/ai-factory-rules [rule text]`
Adds project-specific rules and conventions:
```
/ai-factory-rules Always use DTO instead of arrays
/ai-factory-rules                                    # Interactive — asks what to add
```
- Rules are saved to `.ai-factory/RULES.md`
- Each invocation appends a new rule
- Rules are automatically loaded by `/ai-factory-implement` before task execution
- Use for coding conventions, naming rules, architectural constraints

### `/ai-factory-commit`
Creates conventional commits:
- Analyzes staged changes
- Generates meaningful commit message
- Follows conventional commits format

### `/ai-factory-skill-generator`
Generates new skills:
```
/ai-factory-skill-generator api-patterns
```
- Creates SKILL.md with proper frontmatter
- Follows [Agent Skills](https://agentskills.io) specification
- Can include references, scripts, templates

**Learn Mode** — pass URLs to generate skills from real documentation:
```
/ai-factory-skill-generator https://fastapi.tiangolo.com/tutorial/
/ai-factory-skill-generator https://react.dev/learn https://react.dev/reference/react/hooks
/ai-factory-skill-generator my-skill https://docs.example.com/api
```
- Fetches and deeply studies each URL
- Enriches with web search for best practices and pitfalls
- Synthesizes a structured knowledge base
- Generates a complete skill package with references from real sources
- Supports multiple URLs, mixed sources (docs + blogs), and optional skill name hint

### `/ai-factory-security-checklist [category]`
Security audit based on OWASP Top 10 and best practices:
```
/ai-factory-security-checklist                  # Full audit
/ai-factory-security-checklist auth             # Authentication & sessions
/ai-factory-security-checklist injection        # SQL/NoSQL/Command injection
/ai-factory-security-checklist xss              # Cross-site scripting
/ai-factory-security-checklist csrf             # CSRF protection
/ai-factory-security-checklist secrets          # Secrets & credentials
/ai-factory-security-checklist api              # API security
/ai-factory-security-checklist infra            # Infrastructure & headers
/ai-factory-security-checklist prompt-injection # LLM prompt injection
/ai-factory-security-checklist race-condition   # Race conditions & TOCTOU
```

Each category includes a checklist, vulnerable/safe code examples (TypeScript, PHP), and an automated audit script.

**Ignoring items** — if a finding is intentionally accepted, mark it as ignored:
```
/ai-factory-security-checklist ignore no-csrf
```
- Asks for a reason, saves to `.ai-factory/SECURITY.md`
- Future audits skip these items but still show them in an **"Ignored Items"** section for transparency
- Review ignored items periodically — risks change over time
