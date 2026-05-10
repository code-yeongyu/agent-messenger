import type { KakaoChat } from './types'

export type KakaoChatKind = 'dm' | 'group' | 'open' | 'unknown'

// OpenChat-family `type` codes observed on the wire. KakaoTalk's LOCO
// protocol exposes a numeric `type` field with no documented mapping; these
// five codes consistently identify OpenChat rooms across normal OpenChat,
// OpenChat DMs, and the various OpenChat sub-types seen in production.
const OPEN_CHAT_TYPE_CODES: ReadonlySet<number> = new Set([2, 13, 14, 15, 16])

/**
 * Classify a KakaoTalk chat as `'dm'`, `'group'`, `'open'`, or `'unknown'`.
 *
 * REGRESSION GUARD: An earlier implementation hard-coded `0=dm`, `1=group`,
 * `2=open` on the raw `type` number. Modern KakaoTalk uses codes like `11`
 * for normal DMs and `10` for normal groups, so the old mapping silently
 * classified every real DM as `'unknown'` and bucketed it as a group. Do
 * NOT "simplify" this back to a pure type-code mapping without verifying
 * against a real KakaoTalk session.
 *
 * `'unknown'` is reserved for future protocol drift; the current heuristic
 * never returns it, but it is part of the union so consumers can handle
 * the case defensively.
 */
export function classifyKakaoChat(chat: Pick<KakaoChat, 'type' | 'active_members'>): KakaoChatKind {
  if (OPEN_CHAT_TYPE_CODES.has(chat.type)) return 'open'
  // active_members counts the logged-in user, so a 1:1 DM is exactly 2
  // (self + one other) and a "lone" room with only self is 1.
  if (chat.active_members <= 2) return 'dm'
  return 'group'
}
