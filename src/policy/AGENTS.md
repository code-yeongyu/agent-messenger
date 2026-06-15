# src/policy

Deny-only access-control engine. Platform-agnostic core ([`engine.ts`](engine.ts), [`types.ts`](types.ts)) plus per-platform mappers ([`platform-mappers/`](platform-mappers/)). v1 covers `slack`, `discord`, `teams`.

## Files

- [`engine.ts`](engine.ts) — `PolicyEngine` with `isDenied`, `assertAllowed`, `filterTargets`, `hasRule`.
- [`types.ts`](types.ts) — Zod schemas (`PolicyConfigSchema`, `PolicyRulesSchema`, `ChannelTypeSchema`) and `PolicyTarget` discriminant.
- [`errors.ts`](errors.ts) — `PolicyDeniedError` with `code='POLICY_DENIED'`; message leaks **only** `read|write`, never ids.
- [`loader.ts`](loader.ts) — `loadPolicy(path?)` resolves arg → `AGENT_MESSENGER_POLICY_FILE` → `~/.config/agent-messenger/policy.json`. Fail-closed: ENOENT = no restrictions; anything else throws.
- [`platform-mappers/slack.ts`](platform-mappers/slack.ts) — Reference mapper. Exports `slackChannelToTarget`, `slackSearchResultToTarget`, `shouldResolveChannelForPolicy`, `resolveSlackChannelTarget`. D-prefix shortcut skips API when safe.
- [`platform-mappers/discord.ts`](platform-mappers/discord.ts) — `discordChannelToTarget`, `shouldResolveChannelForPolicy`, `resolveDiscordChannelTarget`.
- [`platform-mappers/teams.ts`](platform-mappers/teams.ts) — `teamsChannelToTarget`, `shouldResolveChannelForPolicy`, `resolveTeamsChannelTarget`. Extra `teamId` arg.

> The CLI `policy` subcommand lives in [`src/commands/policy/`](../commands/policy/), **not** here.

## Engine API

```ts
isDenied(platform, direction, target) → boolean
hasRule(platform, direction, kind: 'channelTypes'|'channelIds'|'userIds') → boolean
assertAllowed(platform, direction, target) → void   // throws PolicyDeniedError
filterTargets<T>(platform, direction, items, project) → T[]
getPolicyEngine() → Promise<PolicyEngine>   // cached singleton
resetPolicyEngine() → void                  // nulls cache (tests)
```

`isDenied` ORs three axes: `channelType` ∈ deny list, `id|parentChannelId` ∈ deny list, `userId` ∈ deny list (or `kind==='user'` and `id` ∈ deny list). Default-empty config allows everything.

## Mapper contract (3 exports)

Every `platform-mappers/<p>.ts` must export:

1. `<p>ChannelToTarget(channel) → PolicyTarget` — Pure; no API calls.
2. `shouldResolveChannelForPolicy(engine, direction) → boolean` — Gate. Returns `engine.hasRule(...)` so the caller can skip resolution when no rules apply.
3. `resolve<P>ChannelTarget(client, engine, channelId, direction[, extra]) → Promise<PolicyTarget>` — Resolve-then-map. Must check `shouldResolveChannelForPolicy` first and return a bare `{kind:'channel',id}` when false. Otherwise fetch via client, map, return.

Platform specifics:
- **Slack** adds `slackSearchResultToTarget` for search filtering. D-prefix shortcut (`channelId.startsWith('D')`) avoids `conversations.info` when no `userIds` rules exist.
- **Discord** fetches `/channels/{id}` (covers guild + DM channels).
- **Teams** requires an extra `teamId` arg; throws if undefined when rules apply.

## Conventions / Anti-patterns

- **Vague errors only.** `PolicyDeniedError` carries `direction` and nothing else. Never include channel IDs or user IDs in the message. The CLI pipeline (`handleError`) masks it to stderr JSON.
- **Fail-closed loader.** `loader.ts` throws on JSON SyntaxError, Zod validation failure, or permission errors. Only ENOENT means "no restrictions".
- **Assert before mutation.** Call `engine.assertAllowed(...)` **before** the client write. Never after.
- **Filter for lists.** Use `engine.filterTargets(...)` for list/search operations so denied items silently disappear rather than erroring.
- **Keep engine platform-agnostic.** No platform-specific logic inside `engine.ts`. All platform knowledge lives in mappers.

## Recipes

### (a) Add a guard to a command

```ts
import { getPolicyEngine } from '@/policy/engine'
import { resolveSlackChannelTarget } from '@/policy/platform-mappers/slack'

const engine = await getPolicyEngine()
const target = await resolveSlackChannelTarget(client, engine, channelId, 'write')
engine.assertAllowed('slack', 'write', target)
// ... now call client.mutate(...)
```

For lists: `engine.filterTargets('slack', 'read', items, slackChannelToTarget)`.

Do **not** catch `PolicyDeniedError` in the command. Let it bubble to `handleError`.

### (b) Add a new platform mapper

1. Create `src/policy/platform-mappers/<new>.ts` with the 3 exports, mirroring [`slack.ts`](platform-mappers/slack.ts).
2. Add `'<new>'` to the `Platform` union in [`types.ts`](types.ts) and `<new>?: PlatformPolicySchema.optional()` to `PolicyConfigSchema`.
3. `engine.ts` needs no changes.
4. Add `<new>.test.ts` mirroring [`slack.test.ts`](platform-mappers/slack.test.ts).
