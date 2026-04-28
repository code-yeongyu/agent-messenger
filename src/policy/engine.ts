import { PolicyDeniedError } from './errors'
import { loadPolicy } from './loader'
import { PolicyConfigSchema } from './types'
import type { Direction, Platform, PolicyConfig, PolicyTarget } from './types'

export type { Direction, Platform } from './types'

export class PolicyEngine {
  constructor(private readonly policyConfig: PolicyConfig = PolicyConfigSchema.parse({})) {}

  isDenied(platform: Platform, direction: Direction, target: PolicyTarget): boolean {
    const denyRules = this.policyConfig[platform]?.[direction]?.deny

    if (denyRules === undefined) {
      return false
    }

    const deniedChannelType =
      target.channelType !== undefined && denyRules.channelTypes?.includes(target.channelType) === true
    const deniedChannelId =
      denyRules.channelIds?.includes(target.id) === true ||
      (target.parentChannelId !== undefined && denyRules.channelIds?.includes(target.parentChannelId) === true)
    const deniedUserId =
      (target.userId !== undefined && denyRules.userIds?.includes(target.userId) === true) ||
      (target.kind === 'user' && denyRules.userIds?.includes(target.id) === true)

    return deniedChannelType || deniedChannelId || deniedUserId
  }

  assertAllowed(platform: Platform, direction: Direction, target: PolicyTarget): void {
    if (this.isDenied(platform, direction, target)) {
      throw new PolicyDeniedError(direction)
    }
  }

  filterTargets<TItem>(
    platform: Platform,
    direction: Direction,
    items: readonly TItem[],
    project: (item: TItem) => PolicyTarget,
  ): TItem[] {
    return items.filter((item) => !this.isDenied(platform, direction, project(item)))
  }
}

let cachedPolicyEngine: Promise<PolicyEngine> | null = null

export function getPolicyEngine(): Promise<PolicyEngine> {
  cachedPolicyEngine ??= loadPolicy().then((policyConfig) => new PolicyEngine(policyConfig))
  return cachedPolicyEngine
}

export function resetPolicyEngine(): void {
  cachedPolicyEngine = null
}
