[← Development Workflow](workflow.md) · [Back to README](../README.md) · [Plan Files →](plan-files.md)

# Core Skills

## Workflow Skills

These skills form the core development loop. See [Development Workflow](workflow.md) for the full diagram and how they connect.

### `/ai-factory.feature <description>`
Starts a new feature:
```
/ai-factory.feature Add user authentication with OAuth
```
- Creates git branch (`feature/user-authentication`)
- Asks about testing, logging, and documentation preferences
- Creates plan file (`feature-user-authentication.md`)
- Invokes `/ai-factory.task` to create implementation plan

**Parallel mode** — work on multiple features simultaneously using `git worktree`:
```
/ai-factory.feature --parallel Add Stripe checkout
```
- Creates a separate working directory (`../my-project-feature-stripe-checkout`)
- Copies AI context files (`.ai-factory/`, `.claude/`, `CLAUDE.md`)
- Each feature gets its own Claude Code session — no branch switching, no conflicts

**Manage parallel features:**
```
/ai-factory.feature --list                          # Show all active worktrees
/ai-factory.feature --cleanup feature/stripe-checkout # Remove worktree and branch
```

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
- Performs deeper codebase analysis than the initial `/ai-factory.task` planning
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
- If plan has `Docs: yes` — runs `/ai-factory.docs` after completion
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
/ai-factory.evolve fix      # Evolve only /ai-factory.fix skill
/ai-factory.evolve all      # Evolve all skills
```
- Reads all patches from `.ai-factory/patches/` — finds recurring problems
- Analyzes project tech stack, conventions, and codebase patterns
- Identifies gaps in existing skills (missing guards, tech-specific pitfalls)
- Proposes targeted improvements with user approval
- Saves evolution log to `.ai-factory/evolutions/`
- The more `/ai-factory.fix` patches you accumulate, the smarter `/ai-factory.evolve` becomes

---

## Utility Skills

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

### `/ai-factory.docs [--web]`
Generates and maintains project documentation:
```
/ai-factory.docs          # Generate or improve documentation
/ai-factory.docs --web    # Also generate HTML version in docs-html/
```

**Smart detection** — adapts to your project's current state:
- **No README?** — analyzes your codebase and creates a lean README (~100 lines) as a landing page + `docs/` directory with topic pages
- **Long README?** — proposes splitting into a landing-page README with detailed content moved to `docs/`
- **Docs exist?** — audits for stale content, broken links, missing topics, and outdated formatting

**Scattered .md cleanup** — finds loose markdown files in your project root (CONTRIBUTING.md, ARCHITECTURE.md, SETUP.md, DEPLOYMENT.md, etc.) and proposes consolidating them into a structured `docs/` directory. No more documentation scattered across 10 root-level files.

**Stays in sync with your code** — when `/ai-factory.feature` asks "Update documentation?" and you say yes, the plan gets `Docs: yes`. After `/ai-factory.implement` finishes all tasks, it automatically runs `/ai-factory.docs` to update documentation. Your docs grow with your codebase, not after the fact.

**Documentation website** — `--web` flag generates a complete static HTML site in `docs-html/` with navigation bar, dark mode support, and clean typography. Ready to host on GitHub Pages or any static hosting.

**Quality checks:**
- Every docs/ page gets prev/next navigation header + "See Also" cross-links
- Technical review — verifies links, structure, code examples, no content loss
- Readability review — "new user eyes" checklist: is it clear, scannable, jargon-free?

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

### `/ai-factory.security-checklist [category]`
Security audit based on OWASP Top 10 and best practices:
```
/ai-factory.security-checklist                  # Full audit
/ai-factory.security-checklist auth             # Authentication & sessions
/ai-factory.security-checklist injection        # SQL/NoSQL/Command injection
/ai-factory.security-checklist xss              # Cross-site scripting
/ai-factory.security-checklist csrf             # CSRF protection
/ai-factory.security-checklist secrets          # Secrets & credentials
/ai-factory.security-checklist api              # API security
/ai-factory.security-checklist infra            # Infrastructure & headers
/ai-factory.security-checklist prompt-injection # LLM prompt injection
/ai-factory.security-checklist race-condition   # Race conditions & TOCTOU
```

Each category includes a checklist, vulnerable/safe code examples (TypeScript, PHP), and an automated audit script.

**Ignoring items** — if a finding is intentionally accepted, mark it as ignored:
```
/ai-factory.security-checklist ignore no-csrf
```
- Asks for a reason, saves to `.ai-factory/SECURITY.md`
- Future audits skip these items but still show them in an **"Ignored Items"** section for transparency
- Review ignored items periodically — risks change over time
