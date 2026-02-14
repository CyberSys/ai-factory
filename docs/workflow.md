[← Getting Started](getting-started.md) · [Back to README](../README.md) · [Core Skills →](skills.md)

# Development Workflow

AI Factory provides a set of **workflow skills** that form the core development loop: plan, improve, implement, fix, evolve. Each skill is a step in the pipeline — they connect to each other and share context through plan files and patches.

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
                             │    (optional)       │                        │
                             │                     │                        │
                             │ Refine plan with    │                        │
                             │ deeper analysis     │                        │
                             │                     │                        │
                             └──────────┬──────────┘                        │
                                        │                                   │
                                        ▼                                   │
                             ┌──────────────────────┐                       │
                             │                      │◀── reads patches ─────┘
                             │ /ai-factory.implement│
                             │ ──── error?          │
                             │  ──▶ /ai-factory.fix │
                             │  Execute tasks       │
                             │  Commit checkpoints  │
                             │                      │
                             └──────────┬───────────┘
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

## When to Use What?

| Command | Use Case | Creates Branch? | Creates Plan? |
|---------|----------|-----------------|---------------|
| `/ai-factory.task` | Small tasks, quick fixes, experiments | No | `.ai-factory/PLAN.md` |
| `/ai-factory.feature` | Full features, stories, epics | Yes | `.ai-factory/features/<branch>.md` |
| `/ai-factory.feature --parallel` | Concurrent features via worktrees | Yes + worktree | User runs `/ai-factory.task` in worktree |
| `/ai-factory.improve` | Refine plan before implementation | No | No (improves existing) |
| `/ai-factory.fix` | Bug fixes, errors, hotfixes | No | No (direct fix) |

## Workflow Skills

These skills form the development pipeline. Each one feeds into the next.

### `/ai-factory.feature <description>` — start a feature

```
/ai-factory.feature Add user authentication with OAuth
```

Creates a git branch, asks about testing/logging/docs preferences, builds a plan file, and invokes `/ai-factory.task` to break it into steps. For parallel work on multiple features, use `--parallel` to create isolated worktrees.

### `/ai-factory.task <description>` — plan the work

```
/ai-factory.task Add product search API
```

Analyzes requirements, explores your codebase for patterns, creates tasks with dependencies, and saves the plan to `.ai-factory/PLAN.md`. For 5+ tasks, includes commit checkpoints.

### `/ai-factory.improve [prompt]` — refine the plan

```
/ai-factory.improve
/ai-factory.improve add validation and error handling
```

Second-pass analysis. Finds missing tasks (migrations, configs, middleware), fixes dependencies, removes redundant work. Shows a diff-like report before applying changes.

### `/ai-factory.implement` — execute the plan

```
/ai-factory.implement        # Continue from where you left off
/ai-factory.implement 5      # Start from task #5
/ai-factory.implement status # Check progress
```

Reads past patches from `.ai-factory/patches/` to learn from previous mistakes, then executes tasks one by one with commit checkpoints. If the plan has `Docs: yes`, runs `/ai-factory.docs` after completion.

### `/ai-factory.fix <bug description>` — fix and learn

```
/ai-factory.fix TypeError: Cannot read property 'name' of undefined
```

Investigates, fixes the bug with logging, and creates a **self-improvement patch** in `.ai-factory/patches/`. No plans, no overhead — just fix, learn, move on. Every patch makes future `/ai-factory.implement` and `/ai-factory.fix` smarter.

### `/ai-factory.evolve` — improve skills from experience

```
/ai-factory.evolve          # Evolve all skills
/ai-factory.evolve fix      # Evolve only the fix skill
```

Reads all accumulated patches, analyzes project patterns, and proposes targeted skill improvements. Closes the learning loop: **fix → patch → evolve → better skills → fewer bugs**.

---

For full details on all skills including utility commands (`/ai-factory.docs`, `/ai-factory.commit`, `/ai-factory.skill-generator`, `/ai-factory.security-checklist`), see [Core Skills](skills.md).

## Why Spec-Driven?

- **Predictable results** - AI follows a plan, not random exploration
- **Resumable sessions** - progress saved in plan files, continue anytime
- **Commit discipline** - structured commits at logical checkpoints
- **No scope creep** - AI does exactly what's in the plan, nothing more
