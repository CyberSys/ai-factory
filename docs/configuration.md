[← Security](security.md) · [Back to README](../README.md)

# Configuration

## `.ai-factory.json`

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

The `agent` field can be any supported agent ID: `claude`, `cursor`, `windsurf`, `kilocode`, `opencode`, `warp`, `zencoder`, `codex`, `copilot`, `gemini`, `junie`, or `universal`. The `skillsDir` is set automatically based on the chosen agent.

## MCP Configuration

AI Factory can configure these MCP servers:

| MCP Server | Use Case | Env Variable |
|------------|----------|--------------|
| GitHub | PRs, issues, repo operations | `GITHUB_TOKEN` |
| Postgres | Database queries | `DATABASE_URL` |
| Filesystem | Advanced file operations | - |

Configuration saved to agent's settings file (e.g. `.claude/settings.local.json` for Claude Code, `.cursor/mcp.json` for Cursor, `.kilocode/mcp.json` for Kilo Code, `opencode.json` for OpenCode, gitignored).

## Project Structure

After initialization (example for Claude Code — other agents use their own directory):

```
your-project/
├── .claude/                   # Agent config dir (varies: .cursor/, .codex/, .ai/, etc.)
│   ├── skills/
│   │   ├── ai-factory/
│   │   ├── feature/
│   │   ├── task/
│   │   ├── improve/
│   │   ├── implement/
│   │   ├── commit/
│   │   ├── docs/
│   │   ├── review/
│   │   └── skill-generator/
│   └── settings.local.json    # MCP config (Claude/Cursor, gitignored)
├── .ai-factory/               # AI Factory working directory
│   ├── DESCRIPTION.md         # Project specification
│   ├── PLAN.md                # Current plan (from /ai-factory.task)
│   ├── SECURITY.md            # Ignored security items (from /security-checklist ignore)
│   ├── features/              # Feature plans (from /ai-factory.feature)
│   │   └── feature-*.md
│   ├── patches/               # Self-improvement patches (from /ai-factory.fix)
│   │   └── 2026-02-07-14.30.md
│   └── evolutions/            # Evolution logs (from /ai-factory.evolve)
│       └── 2026-02-08-10.00.md
└── .ai-factory.json           # AI Factory config
```

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

## See Also

- [Getting Started](getting-started.md) — installation, supported agents, first project
- [Development Workflow](workflow.md) — how to use the workflow skills
- [Security](security.md) — how external skills are scanned before use
