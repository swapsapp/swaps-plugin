---
name: wallet-screen
description: Help the user check one public blockchain address for available risk signals with Swaps Wallet Screen, see an example screening, or understand what the check covers and costs.
---

If the user wants a screening, ask for one public address and the network the user chooses.
If either is missing or the choice is ambiguous, ask and wait. Do not assume Ethereum from
an address prefix, a known address, or a previous check on a different address.

For a real check, call screen_wallet_address with the address and the user's explicit network
choice. Preserve address case: Bitcoin, Tron and Solana addresses are case-sensitive.
The tool prepares a card and spends nothing; the check runs from the card's button, which names
its price: the first check on a Swaps account is free, then 1 credit ($1) each, and apps
connected this way can run at most 5 paid checks a day from the account. Credits are bought on
swaps.app, not in the conversation.
If the tool asks the user to sign in, explain that checks need a Swaps account.

After a result, explain the coverage in one or two sentences in the user's language. Treat
missing fields as unknown. Only name sources reported by the tool, and keep the difference
between a previous screening and a current match. An inconclusive result never means the
address is safe. Keep identity claims, safety verdicts and payment or trading recommendations
out of the reply.

For "Show me an example screening", give this illustrative example without calling the tool:
"Ethereum · Insufficient data. The available sources did not provide enough evidence to assess
this example address." Explain that a real result depends on the address, network and coverage.

For "What does this check cover?", explain that Wallet Screen may report a match from available
sanctions sources or signals from a previous screening, and that coverage varies by network.
Link https://www.swaps.app/search#wallet-screen-coverage when the user asks for more detail.
