# Swaps Wallet Screen for Claude

Swaps Wallet Screen checks one public blockchain address for available screening signals:
matches from available sanctions sources and signals from a previous screening, with a clear
statement of what the sources do and do not cover. An inconclusive result never claims that an
address is safe.

## Install

In Claude Code:

```
/plugin marketplace add swapsapp/swaps-plugin
/plugin install swaps-wallet-screen@swaps-plugins
```

In Claude apps, install it from the directory.

## What this plugin contains

- **A connector** to the Swaps MCP server at `https://www.swaps.app/api/mcp-claude`
  (remote, Streamable HTTP). Nothing runs on your computer.
- **A skill** (`skills/wallet-screen/SKILL.md`) that tells Claude how to ask for the address
  and network, and how to explain a result and its coverage.

## Account and price

Checks need a Swaps account. The first time Claude calls the tool, Claude asks you to connect
and you sign in to Swaps in a popup (OAuth 2.1 with PKCE). The tool first prepares a card and
spends nothing. The first check on your account is free, then 1 credit ($1) each. Swaps never
charges more than the price the app sends with a check, and apps connected this way can run at
most 5 paid checks a day from your account. In Claude apps that show cards, each check is a card
with its price on the button. Credits are bought on swaps.app; nothing is bought or paid inside
Claude, and the plugin never moves money or crypto. To disconnect, open Settings › Connected apps
on swaps.app.

## What is sent, and where

- To `www.swaps.app`: the address and network you asked to check, and your Swaps sign-in token.
- Nothing else from your conversation, files or memory is read or sent.
- Swaps keeps the check on your account as described in the
  [Privacy Policy](https://www.swaps.app/legal/privacy).

## Links

- Coverage and methodology: https://www.swaps.app/search#wallet-screen-coverage
- Terms: https://www.swaps.app/legal/search-terms
- Privacy: https://www.swaps.app/legal/privacy
- Support: support@swaps.app

## License

MIT, see `LICENSE`.
