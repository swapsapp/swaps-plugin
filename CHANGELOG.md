# Changelog

All notable changes to the Swaps MCP plugin are documented here.

## [1.0.0] - 2026-05-13

### Added

- Canonical multi-host plugin distribution for `@agent.swaps/mcp-server@1.0.1`.
- Install paths for **Claude Code**, **OpenAI Codex**, **Gemini CLI**, **Cursor**, **Windsurf**, and **Claude Desktop**.
- `.claude-plugin/` (manifest + self-hosted marketplace) for `/plugin marketplace add swapsapp/swaps-plugin`.
- `.codex-plugin/` (Codex local plugin manifest) for ~/plugins/swaps-mcp registration.
- Universal `.mcp.json` (also valid as Cursor / Windsurf / Claude Desktop / Gemini snippet).
- Five MCP tools exposed: `swaps_quote`, `swaps_taxonomy`, `swaps_providers_for_corridor`, `swaps_explain_choice`, `swaps_corridors`.
- Skill instructions in `skills/swaps-mcp/SKILL.md` that treat the inline `winner.explain` from `swaps_quote` as the canonical ranking rationale and direct agents away from the degraded `swaps_explain_choice` endpoint (server-side cache fix on the v1.1.x backlog).
- Local smoke test (`tests/smoke.mjs`) with tristate pass/warn/fail — asserts `winner.explain.rankingCriteria` is present and downgrades `EXPLAIN_EXPIRED` on `swaps_explain_choice` to a documented WARN.

### Consolidates

Supersedes two prior throwaway repos that were archived 2026-05-13:

- `swapsapp/claude-code-plugin` — Claude-Code-only scaffold
- `swapsapp/swaps-codex-plugin` — Codex local plugin scaffold

This repo is the canonical successor for both ecosystems plus four additional hosts.
