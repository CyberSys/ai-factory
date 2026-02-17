[← Security](security.md) · [Back to README](../README.md)

# Configuration

## `.ai-factory.json`

```json
{
  "version": "2.0.0",
  "agents": [
    {
      "id": "claude",
      "skillsDir": ".claude/skills",
      "installedSkills": ["ai-factory", "ai-factory-plan", "ai-factory-improve", "ai-factory-implement", "ai-factory-commit", "ai-factory-build-automation"],
      "mcp": {
        "github": true,
        "postgres": false,
        "filesystem": false,
        "chromeDevtools": false
      }
    },
    {
      "id": "codex",
      "skillsDir": ".codex/skills",
      "installedSkills": ["ai-factory", "ai-factory-plan", "ai-factory-implement"],
      "mcp": {
        "github": false,
        "postgres": false,
        "filesystem": false,
        "chromeDevtools": false
      }
    }
  ]
}
```

The `agents` array can include any supported agent IDs: `claude`, `cursor`, `windsurf`, `roocode`, `kilocode`, `antigravity`, `opencode`, `warp`, `zencoder`, `codex`, `copilot`, `gemini`, `junie`, or `universal`. Each agent keeps its own `skillsDir`, installed skills list, and MCP preferences.

## MCP Configuration

AI Factory can configure these MCP servers:

| MCP Server | Use Case | Env Variable |
|------------|----------|--------------|
| GitHub | PRs, issues, repo operations | `GITHUB_TOKEN` |
| Postgres | Database queries | `DATABASE_URL` |
| Filesystem | Advanced file operations | - |
| Chrome Devtools | Browser inspection, debugging, performance | - |

Configuration saved to agent's settings file (e.g. `.claude/settings.local.json` for Claude Code, `.cursor/mcp.json` for Cursor, `.roo/mcp.json` for Roo Code, `.kilocode/mcp.json` for Kilo Code, `opencode.json` for OpenCode, gitignored).

## Project Structure

After initialization (example for Claude Code — other agents use their own directory):

```
your-project/
├── .claude/                   # Agent config dir (varies: .cursor/, .codex/, .ai/, etc.)
│   ├── skills/
│   │   ├── ai-factory/
│   │   ├── ai-factory-plan/
│   │   ├── ai-factory-improve/
│   │   ├── ai-factory-implement/
│   │   ├── ai-factory-commit/
│   │   ├── ai-factory-dockerize/
│   │   ├── ai-factory-build-automation/
│   │   ├── ai-factory-verify/
│   │   ├── ai-factory-docs/
│   │   ├── ai-factory-review/
│   │   └── ai-factory-skill-generator/
│   └── settings.local.json    # MCP config (Claude/Cursor, gitignored)
├── .ai-factory/               # AI Factory working directory
│   ├── DESCRIPTION.md         # Project specification
│   ├── ARCHITECTURE.md        # Architecture decisions and guidelines
│   ├── PLAN.md                # Current plan (from /ai-factory-plan fast)
│   ├── SECURITY.md            # Ignored security items (from /ai-factory-security-checklist ignore)
│   ├── changes/               # Plans from /ai-factory-plan full
│   │   └── <branch-name>.md
│   ├── patches/               # Self-improvement patches (from /ai-factory-fix)
│   │   └── 2026-02-07-14.30.md
│   └── evolutions/            # Evolution logs (from /ai-factory-evolve)
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
