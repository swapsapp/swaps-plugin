# Swaps Plugin — Agent-Native Crypto On-Ramp Aggregator

> Install once, quote anywhere. Live on-ramp quotes from Paybis, Transak, Mercuryo, Coinbase Onramp, Bridge, and Partna — surfaced as MCP tools to any AI agent.

This is the **canonical** Swaps plugin distribution. One repo, one source of truth, one install command per host.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm](https://img.shields.io/npm/v/@agent.swaps/mcp-server.svg)](https://www.npmjs.com/package/@agent.swaps/mcp-server)
[![Plugin v1.0.0](https://img.shields.io/badge/plugin-v1.0.0-blue)](https://github.com/swapsapp/swaps-plugin/releases/tag/v1.0.0)

Free, open-source (MIT), no API key.

## Five tools your agent gets

| Tool | What it does |
|---|---|
| `swaps_quote` | Live quote + ranked alternatives, with **inline ranking rationale** (`winner.explain`). Primary tool. |
| `swaps_taxonomy` | 6-axis provider taxonomy snapshot. |
| `swaps_providers_for_corridor` | Provider candidates for a given country + payment method. |
| `swaps_corridors` | Curated top buy/sell corridors. |
| `swaps_explain_choice` | Post-hoc audit by `quoteId` (currently degraded — prefer inline `winner.explain` on `swaps_quote`). |

## Install — by host

### Claude Code

```shell
/plugin marketplace add swapsapp/swaps-plugin
/plugin install swaps-mcp@swaps-plugins
/reload-plugins
```

### OpenAI Codex (local plugin)

```shell
# Clone into your Codex plugins directory
git clone https://github.com/swapsapp/swaps-plugin ~/plugins/swaps-mcp

# Register in ~/.agents/plugins/marketplace.json under "plugins"
# Restart Codex to load
```

### Gemini CLI

Paste into `~/.gemini/settings.json` (user scope) or `.gemini/settings.json` (project scope):

```json
{
  "mcpServers": {
    "swaps": {
      "command": "npx",
      "args": ["-y", "@agent.swaps/mcp-server@1.0.1"]
    }
  }
}
```

### Cursor

Paste into `.cursor/mcp.json` (workspace) or `~/.cursor/mcp.json` (global):

```json
{
  "mcpServers": {
    "swaps": {
      "command": "npx",
      "args": ["-y", "@agent.swaps/mcp-server@1.0.1"]
    }
  }
}
```

### Windsurf

Paste into `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "swaps": {
      "command": "npx",
      "args": ["-y", "@agent.swaps/mcp-server@1.0.1"]
    }
  }
}
```

### Claude Desktop

Paste into `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or platform equivalent:

```json
{
  "mcpServers": {
    "swaps": {
      "command": "npx",
      "args": ["-y", "@agent.swaps/mcp-server@1.0.1"]
    }
  }
}
```

Restart the host application after editing the config file.

## Try it

After install, ask the agent:

```
Use swaps_quote to find the cheapest way to buy 100 USD of BTC in the US,
then read winner.explain and tell me why the winning provider beat the others.
```

You'll see a real-time quote with provider, fees, ETA, KYC tier, checkout URL, and the full ranking rationale.

## Stable public endpoints (host-agnostic)

The MCP server is a thin wrapper around four public HTTP endpoints any language can call directly:

| Endpoint | Description |
|---|---|
| `https://agent.swaps.app/openapi.json` | OpenAPI 3.1 spec |
| `https://agent.swaps.app/taxonomy.json` | Provider taxonomy snapshot |
| `https://agent.swaps.app/llm/quote` | Live quote |
| `https://agent.swaps.app/llm/routing-explainer` | Post-hoc explainer (currently degraded) |

These URLs are permanent. Breaking changes ship under `/agent/v2/*` while v1 stays live for at least six months.

## Architecture

```
AI agent (Claude / Codex / Gemini / Cursor / Windsurf / Claude Desktop)
    ↓
this plugin (manifest + auto-loaded skill)
    ↓
@agent.swaps/mcp-server@1.0.1 (npm)
    ↓
agent.swaps.app/llm/quote (Vercel rewrite → Supabase Edge Function)
    ↓
SmartRouter (6 provider adapters)
```

## Repo layout

```
swaps-plugin/
├── .claude-plugin/
│   ├── plugin.json          ← Claude Code plugin manifest
│   └── marketplace.json     ← self-hosted marketplace catalog
├── .codex-plugin/
│   └── plugin.json          ← OpenAI Codex local plugin manifest
├── .mcp.json                ← universal MCP server config
├── skills/
│   └── swaps-mcp/
│       └── SKILL.md         ← auto-loaded skill with tool-usage guidance
├── tests/
│   └── smoke.mjs            ← MCP handshake + tool round-trip verification
├── assets/                  ← icons + screenshots for marketplace listings
├── README.md                ← this file
├── LICENSE                  ← MIT
└── CHANGELOG.md
```

## Verifying your install

After install, run a smoke check from your terminal:

```shell
git clone https://github.com/swapsapp/swaps-plugin && cd swaps-plugin
mkdir -p /private/tmp/swaps-mcp-test-deps
cd /private/tmp/swaps-mcp-test-deps && npm install @modelcontextprotocol/sdk
cd - && node tests/smoke.mjs
```

Expected: `pass-with-warnings` (9 PASS + 1 WARN on `swaps_explain_choice`, known v1.1.x backlog). Exit code 0.

## Versioning

| Component | Version | Where it lives |
|---|---|---|
| Plugin (this repo) | 1.0.0 | `.claude-plugin/plugin.json` |
| MCP server | 1.0.1 | `@agent.swaps/mcp-server` on npm |

Plugin and server versions are independent. A plugin bump (e.g. SKILL.md improvements, new host doc) does not require a server bump and vice versa.

## Source code

- Plugin (this repo): [`github.com/swapsapp/swaps-plugin`](https://github.com/swapsapp/swaps-plugin)
- MCP server: [`github.com/swapsapp/swaps-mcp-server`](https://github.com/swapsapp/swaps-mcp-server)
- Live OpenAPI spec: [`agent.swaps.app/openapi.json`](https://agent.swaps.app/openapi.json)
- Canonical dev page: [`swaps.app/developers/skills/mcp-server`](https://www.swaps.app/developers/skills/mcp-server)

## License

MIT. See [LICENSE](./LICENSE).

## Regulatory note

Swaps operates through licensed local partners while pursuing its own VASP/MSB license. Quotes returned by this plugin are informational; final amounts at checkout depend on the chosen provider's pricing, KYC outcome, and rail availability.
