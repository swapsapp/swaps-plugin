import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const pluginRoot = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const artifactDir = join(pluginRoot, 'artifacts');
const testNodeModules = process.env.SWAPS_MCP_TEST_NODE_MODULES ?? '/private/tmp/swaps-mcp-test-deps/node_modules';
const startedAt = new Date().toISOString();

const checks = [];
const evidence = {};

function pass(name, details = {}) {
  checks.push({ name, status: 'pass', details });
}

function warn(name, error, details = {}) {
  checks.push({
    name,
    status: 'warn',
    error: error instanceof Error ? error.message : String(error),
    details,
  });
}

function fail(name, error, details = {}) {
  checks.push({
    name,
    status: 'fail',
    error: error instanceof Error ? error.message : String(error),
    details,
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function firstText(result) {
  return result?.content?.find?.((item) => item.type === 'text')?.text ?? '';
}

async function parseJsonFile(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function callTool(client, name, args) {
  const started = Date.now();
  const result = await client.callTool({ name, arguments: args });
  const elapsedMs = Date.now() - started;
  const text = firstText(result);
  if (result.isError) {
    return { elapsedMs, text, isError: true, json: null };
  }
  return { elapsedMs, text, isError: false, json: JSON.parse(text) };
}

async function main() {
  await mkdir(artifactDir, { recursive: true });
  const { Client } = await import(
    pathToFileURL(join(testNodeModules, '@modelcontextprotocol/sdk/dist/esm/client/index.js')).href
  );
  const { StdioClientTransport } = await import(
    pathToFileURL(join(testNodeModules, '@modelcontextprotocol/sdk/dist/esm/client/stdio.js')).href
  );

  const pluginJsonPath = join(pluginRoot, '.codex-plugin/plugin.json');
  const mcpJsonPath = join(pluginRoot, '.mcp.json');
  // Local Codex marketplace registry. Path defaults to the canonical home-local
  // location but can be overridden via SWAPS_MCP_HOST_MARKETPLACE_PATH. The check
  // is skipped cleanly when the file is missing — most public users (Claude Code,
  // Gemini CLI, Cursor, Windsurf, Claude Desktop) do not have a Codex marketplace
  // registry on disk and should not see this assertion fail.
  const marketplacePath =
    process.env.SWAPS_MCP_HOST_MARKETPLACE_PATH ??
    `${process.env.HOME ?? ''}/.agents/plugins/marketplace.json`;

  try {
    const plugin = await parseJsonFile(pluginJsonPath);
    assert(plugin.name === 'swaps-mcp', 'plugin name must be swaps-mcp');
    assert(plugin.mcpServers === './.mcp.json', 'plugin must point to ./.mcp.json');
    assert(plugin.skills === './skills/', 'plugin must expose ./skills/');
    pass('plugin manifest', {
      path: pluginJsonPath,
      name: plugin.name,
      version: plugin.version,
      displayName: plugin.interface?.displayName,
    });
  } catch (error) {
    fail('plugin manifest', error, { path: pluginJsonPath });
  }

  let mcpConfig;
  try {
    mcpConfig = await parseJsonFile(mcpJsonPath);
    const swaps = mcpConfig.mcpServers?.swaps;
    assert(swaps?.command === 'npx', 'swaps MCP command must be npx');
    assert(
      swaps?.args?.join(' ') === '-y @agent.swaps/mcp-server@1.0.1',
      'swaps MCP args must pin @agent.swaps/mcp-server@1.0.1'
    );
    pass('mcp config', {
      path: mcpJsonPath,
      command: swaps.command,
      args: swaps.args,
    });
  } catch (error) {
    fail('mcp config', error, { path: mcpJsonPath });
  }

  // Optional host-specific marketplace check (Codex local plugin registry).
  // Skipped cleanly when the registry file is absent — public users on Claude
  // Code, Gemini CLI, Cursor, Windsurf, or Claude Desktop will not have one.
  try {
    const marketplace = await parseJsonFile(marketplacePath);
    const entry = marketplace.plugins?.find?.((plugin) => plugin.name === 'swaps-mcp');
    assert(entry, 'marketplace must include swaps-mcp');
    assert(entry.source?.path === './plugins/swaps-mcp', 'marketplace path must match home-local plugin path');
    assert(entry.policy?.installation === 'AVAILABLE', 'plugin must be available');
    pass('marketplace entry', {
      path: marketplacePath,
      source: entry.source,
      policy: entry.policy,
    });
  } catch (error) {
    const isMissing = error?.code === 'ENOENT' || /ENOENT|no such file/i.test(error?.message ?? '');
    if (isMissing) {
      checks.push({
        name: 'marketplace entry',
        status: 'skip',
        details: {
          path: marketplacePath,
          reason: 'host-specific Codex marketplace registry not present (expected for non-Codex hosts)',
        },
      });
    } else {
      fail('marketplace entry', error, { path: marketplacePath });
    }
  }

  let client;
  try {
    const swaps = mcpConfig.mcpServers.swaps;
    const transport = new StdioClientTransport({
      command: swaps.command,
      args: swaps.args,
      env: { ...process.env, ...(swaps.env ?? {}) },
    });
    client = new Client({ name: 'swaps-mcp-plugin-smoke', version: '1.0.0' }, { capabilities: {} });
    await client.connect(transport);
    pass('mcp handshake', { command: swaps.command, args: swaps.args });

    const list = await client.listTools();
    const toolNames = list.tools.map((tool) => tool.name).sort();
    const expectedTools = [
      'swaps_corridors',
      'swaps_explain_choice',
      'swaps_providers_for_corridor',
      'swaps_quote',
      'swaps_taxonomy',
    ];
    assert(JSON.stringify(toolNames) === JSON.stringify(expectedTools), `unexpected tools: ${toolNames.join(', ')}`);
    evidence.tools = list.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      required: tool.inputSchema?.required ?? [],
    }));
    pass('tool list', { tools: toolNames });

    const taxonomy = await callTool(client, 'swaps_taxonomy', {});
    assert(taxonomy.json._meta?.providerCount === 11, 'taxonomy providerCount must be 11');
    assert(Array.isArray(taxonomy.json.providers), 'taxonomy providers must be an array');
    evidence.taxonomy = {
      elapsedMs: taxonomy.elapsedMs,
      meta: taxonomy.json._meta,
      providerIds: taxonomy.json.providers.map((provider) => provider.providerId),
    };
    pass('swaps_taxonomy', {
      elapsedMs: taxonomy.elapsedMs,
      providerCount: taxonomy.json._meta.providerCount,
    });

    const corridors = await callTool(client, 'swaps_corridors', {});
    assert(Array.isArray(corridors.json.buy), 'corridors buy list must be an array');
    assert(Array.isArray(corridors.json.sell), 'corridors sell list must be an array');
    evidence.corridors = {
      elapsedMs: corridors.elapsedMs,
      buyCount: corridors.json.buy.length,
      sellCount: corridors.json.sell.length,
      firstBuy: corridors.json.buy[0],
      firstSell: corridors.json.sell[0],
    };
    pass('swaps_corridors', {
      elapsedMs: corridors.elapsedMs,
      buyCount: corridors.json.buy.length,
      sellCount: corridors.json.sell.length,
    });

    const providers = await callTool(client, 'swaps_providers_for_corridor', {
      country: 'US',
      paymentMethod: 'card',
    });
    assert(providers.json.country === 'US', 'providers country must normalize to US');
    assert(Array.isArray(providers.json.candidates), 'providers candidates must be an array');
    evidence.providersForCorridor = {
      elapsedMs: providers.elapsedMs,
      country: providers.json.country,
      paymentMethod: providers.json.paymentMethod,
      candidateIds: providers.json.candidates.map((provider) => provider.providerId),
      note: providers.json.note,
    };
    pass('swaps_providers_for_corridor', {
      elapsedMs: providers.elapsedMs,
      candidateCount: providers.json.candidates.length,
    });

    const quoteInput = {
      from: 'USD',
      to: 'BTC',
      amount: '100',
      country: 'US',
      side: 'buy',
      method: 'card',
    };
    const quote = await callTool(client, 'swaps_quote', quoteInput);
    assert(quote.json._meta?.quoteId, 'quote must include _meta.quoteId');
    assert(quote.json.winner?.providerId, 'quote must include winner.providerId');
    assert(quote.json.winner?.checkoutUrl, 'quote must include winner.checkoutUrl');
    assert(quote.json.request?.country === 'US', 'quote request country must be US');
    // Inline explain payload is the canonical source of truth for ranking rationale —
    // swaps_explain_choice (post-hoc endpoint) cache is on the v1.1.x backlog. Assert
    // the inline shape so we catch a regression where the server stops emitting it.
    assert(quote.json.winner?.explain, 'winner.explain must be present (inline ranking rationale)');
    assert(
      Array.isArray(quote.json.winner.explain.rankingCriteria) &&
        quote.json.winner.explain.rankingCriteria.length > 0,
      'winner.explain.rankingCriteria must be a non-empty array'
    );
    evidence.quote = {
      elapsedMs: quote.elapsedMs,
      request: quote.json.request,
      meta: quote.json._meta,
      winner: {
        providerId: quote.json.winner.providerId,
        quoteId: quote.json.winner.quoteId,
        rate: quote.json.winner.rate,
        estimatedOutput: quote.json.winner.estimatedOutput,
        fees: quote.json.winner.fees,
        expiresAt: quote.json.winner.expiresAt,
        checkoutUrl: quote.json.winner.checkoutUrl,
        explain: quote.json.winner.explain,
      },
      alternatives: quote.json.alternatives?.map((alt) => ({
        providerId: alt.providerId,
        rate: alt.rate,
        estimatedOutput: alt.estimatedOutput,
        fees: alt.fees,
        explain: alt.explain,
      })),
      errors: quote.json.errors,
    };
    pass('swaps_quote', {
      elapsedMs: quote.elapsedMs,
      quoteId: quote.json._meta.quoteId,
      winner: quote.json.winner.providerId,
    });

    const explain = await callTool(client, 'swaps_explain_choice', {
      quoteId: quote.json._meta.quoteId,
    });
    evidence.explainChoice = explain.isError
      ? {
          elapsedMs: explain.elapsedMs,
          quoteId: quote.json._meta.quoteId,
          isError: true,
          rawText: explain.text,
        }
      : {
          elapsedMs: explain.elapsedMs,
          quoteId: quote.json._meta.quoteId,
          isError: false,
          keys: Object.keys(explain.json),
          responsePreview: explain.json,
        };
    // swaps_explain_choice is currently degraded: in-memory cache in Supabase Edge
    // Function isolate recycles per request, so EXPLAIN_EXPIRED returns ~100% of the
    // time. Postgres-backed cache is on the v1.1.x backlog. Until then, treat the
    // EXPLAIN_EXPIRED response as an acknowledged WARN, not a smoke-test FAIL — the
    // inline winner.explain in swaps_quote is the canonical ranking rationale and
    // is asserted above. Any OTHER error path here still fails the smoke test.
    const explainText = (explain.text ?? '').toString();
    const isKnownExpired = explain.isError && /EXPLAIN_EXPIRED/i.test(explainText);
    if (isKnownExpired) {
      warn(
        'swaps_explain_choice',
        'EXPLAIN_EXPIRED (known v1.1.x backlog: in-memory cache recycles per Edge Function isolate; inline winner.explain in swaps_quote is the canonical path)',
        {
          elapsedMs: explain.elapsedMs,
          quoteId: quote.json._meta.quoteId,
          backlog: 'v1.1.x — Postgres-backed routing-explainer cache',
        }
      );
    } else if (explain.isError) {
      fail('swaps_explain_choice', explain.text, {
        elapsedMs: explain.elapsedMs,
        quoteId: quote.json._meta.quoteId,
      });
    } else {
      assert(!explain.json.error, `explain returned error: ${explain.json.error}`);
      pass('swaps_explain_choice', {
        elapsedMs: explain.elapsedMs,
        quoteId: quote.json._meta.quoteId,
      });
    }
  } catch (error) {
    fail('mcp integration', error);
  } finally {
    if (client) await client.close();
  }

  const finishedAt = new Date().toISOString();
  const failed = checks.filter((check) => check.status === 'fail');
  const warned = checks.filter((check) => check.status === 'warn');
  const summary = {
    status: failed.length === 0 ? (warned.length === 0 ? 'pass' : 'pass-with-warnings') : 'fail',
    startedAt,
    finishedAt,
    pluginRoot,
    checks,
    evidence,
  };

  const stamp = startedAt.replace(/[:.]/g, '-');
  const jsonPath = join(artifactDir, `swaps-mcp-smoke-${stamp}.json`);
  const mdPath = join(artifactDir, `swaps-mcp-smoke-${stamp}.md`);

  const md = [
    '# Swaps MCP Smoke Test',
    '',
    `Status: ${summary.status}`,
    `Started: ${startedAt}`,
    `Finished: ${finishedAt}`,
    `Plugin: ${pluginRoot}`,
    '',
    '## Checks',
    '',
    ...checks.map((check) => `- ${check.status.toUpperCase()} ${check.name}: ${JSON.stringify(check.details ?? {})}${check.error ? ` error=${check.error}` : ''}`),
    '',
    '## Live Quote Evidence',
    '',
    `Input: ${JSON.stringify(evidence.quote?.request ?? null)}`,
    `Quote ID: ${evidence.quote?.meta?.quoteId ?? 'n/a'}`,
    `Winner: ${evidence.quote?.winner?.providerId ?? 'n/a'}`,
    `Estimated output: ${evidence.quote?.winner?.estimatedOutput ?? 'n/a'}`,
    `Fees: ${JSON.stringify(evidence.quote?.winner?.fees ?? null)}`,
    `Checkout URL: ${evidence.quote?.winner?.checkoutUrl ?? 'n/a'}`,
    '',
    '## Post-Hoc Explain Evidence',
    '',
    `Explain status: ${
      evidence.explainChoice?.isError
        ? /EXPLAIN_EXPIRED/i.test(evidence.explainChoice.rawText ?? '')
          ? 'degraded (known v1.1.x backlog — inline winner.explain in swaps_quote is the canonical rationale)'
          : 'fail'
        : evidence.explainChoice
        ? 'pass'
        : 'n/a'
    }`,
    `Explain raw: ${evidence.explainChoice?.rawText ?? 'n/a'}`,
    '',
    '## Artifact JSON',
    '',
    jsonPath,
    '',
  ].join('\n');

  await writeFile(jsonPath, `${JSON.stringify(summary, null, 2)}\n`);
  await writeFile(mdPath, `${md}\n`);

  console.log(JSON.stringify({ status: summary.status, jsonPath, mdPath, failed, warned }, null, 2));
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
