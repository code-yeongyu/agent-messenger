# Agent Messenger - New API Implementation Plan

## Overview

확장할 API 목록과 구현 계획. 실험으로 검증된 API들을 기반으로 함.

---

## Slack APIs (xoxc token + d cookie 필요)

### 이미 구현됨 (기존)
- `conversations.list` - 채널 목록
- `conversations.history` - 메시지 히스토리
- `conversations.replies` - 스레드 replies
- `chat.postMessage` - 메시지 전송
- `users.list` - 유저 목록
- `reactions.add/remove` - 리액션
- `files.upload` - 파일 업로드
- `search.messages` - 메시지 검색

### 신규 구현 - Wave 1 (✅ 완료)
| API | Endpoint | 용도 | 상태 |
|-----|----------|------|------|
| Unread Counts | `client.counts` | 채널/DM/스레드 안읽은 메시지 수 | ✅ 완료 |
| Unread Threads | `subscriptions.thread.getView` | 안읽은 스레드 목록 | ✅ 완료 |
| Mark as Read | `conversations.mark` | 읽음 표시 | ✅ 완료 |

### 신규 구현 - Wave 2 (✅ 완료)
| API | Endpoint | 용도 | 상태 |
|-----|----------|------|------|
| Activity Feed | `activity.feed` | 멘션, 리액션 등 알림 | ✅ 완료 |
| Saved Items | `saved.list` | "나중에" 저장 항목 | ✅ 완료 |
| Drafts | `drafts.list` | 임시저장 메시지 | ✅ 완료 |
| Sidebar Sections | `users.channelSections.list` | 사이드바 폴더 | ✅ 완료 |

### Slack Activity Feed API 상세
```
Endpoint: POST https://slack.com/api/activity.feed
Parameters:
  - token: xoxc token
  - types: thread_reply,message_reaction,at_user,at_channel,keyword
  - mode: priority_unreads_v1 (안읽은것만) / chrono_reads_and_unreads (전체)
  - limit: 20
```

### Slack Saved Items API 상세
```
Endpoint: POST https://slack.com/api/saved.list
Parameters:
  - token: xoxc token
  - cursor: 페이지네이션

Related:
  - saved.add: 아이템 추가
  - saved.delete: 아이템 제거
```

---

## Discord APIs (user token 필요)

### 이미 구현됨 (기존)
- `GET /users/@me` - 현재 유저
- `GET /users/@me/guilds` - 길드 목록
- `GET /guilds/{id}/channels` - 채널 목록
- `GET /channels/{id}/messages` - 메시지 조회
- `POST /channels/{id}/messages` - 메시지 전송
- `PUT/DELETE /reactions` - 리액션

### 신규 구현 - Wave 1 (✅ 완료)
| API | Endpoint | 용도 | 상태 |
|-----|----------|------|------|
| DM Channels | `GET /users/@me/channels` | 개인 DM 목록 | ✅ 완료 |
| Mentions | `GET /users/@me/mentions` | @멘션 알림 | ✅ 완료 |
| Ack Message | `POST /channels/{id}/messages/{id}/ack` | 읽음 표시 | ✅ 완료 |

### 신규 구현 - Wave 2 (✅ 완료)
| API | Endpoint | 용도 | 상태 |
|-----|----------|------|------|
| Read States | `GET /users/@me/read-states` | 채널별 읽음 상태 | ✅ 완료 |
| Relationships | `GET /users/@me/relationships` | 친구 목록 | ✅ 완료 |
| User Notes | `GET /users/@me/notes` | 유저 메모 | ✅ 완료 |
| Member Search | `GET /guilds/{id}/members/search` | 멤버 검색 | ✅ 완료 |
| User Profile | `GET /users/{id}/profile` | 상세 프로필 | ✅ 완료 |

### Discord DM Channels API 상세
```
Endpoint: GET /users/@me/channels
Response: [
  {
    "id": "123456789",
    "type": 1,  // 1=DM, 3=Group DM
    "recipients": [...],
    "last_message_id": "..."
  }
]
```

### Discord Mentions API 상세
```
Endpoint: GET /users/@me/mentions?limit=25&roles=true&everyone=true
Parameters:
  - limit: 1-100
  - guild_id: 특정 길드만 필터
  - roles: @role 멘션 포함
  - everyone: @everyone 멘션 포함
```

### Discord Read States API 상세
```
Endpoint: GET /users/@me/read-states
Response: [
  {
    "id": "channel_id",
    "last_message_id": "...",
    "mention_count": 0
  }
]
```

### Discord Relationships API 상세
```
Endpoint: GET /users/@me/relationships
Response: [
  {
    "id": "user_id",
    "type": 1,  // 1=Friend, 2=Blocked, 3=Incoming, 4=Outgoing
    "user": {...}
  }
]
```

---

## 구현 순서

### Phase 1: Core Unreads (✅ 완료)
1. ✅ Slack: `client.counts`, `subscriptions.thread.getView`, `conversations.mark`
2. ✅ Discord: `listDMChannels`, `getMentions`, `ackMessage`

### Phase 2: Extended Features (✅ 완료)
3. ✅ Discord: `getReadStates`, `getRelationships` (친구 목록)
4. ✅ Slack: `activity.feed` (알림), `saved.list` (나중에 저장)

### Phase 3: Advanced (✅ 완료)
5. ✅ Discord: `getUserNotes`, `searchMembers`, `getUserProfile`
6. ✅ Slack: `drafts.list`, `users.channelSections.list`

---

## CLI 명령어 구조

### Slack Commands (agent-slack)
```bash
# Unreads (Wave 1 - 완료)
agent-slack unread counts              # 안읽은 메시지 수
agent-slack unread threads [--limit]   # 안읽은 스레드
agent-slack unread mark <ch> <ts>      # 읽음 표시

# Activity (Wave 2)
agent-slack activity list [--unread]   # 알림 목록
agent-slack activity mark-read         # 알림 읽음 처리

# Saved (Wave 2)
agent-slack saved list                 # 저장 항목
agent-slack saved add <ch> <ts>        # 저장
agent-slack saved remove <id>          # 제거
```

### Discord Commands (agent-discord)
```bash
# DM (Wave 1)
agent-discord dm list                  # DM 채널 목록

# Mentions (Wave 1)
agent-discord mention list [--limit]   # 멘션 알림
agent-discord message ack <ch> <msg>   # 읽음 표시

# Friends (Wave 2)
agent-discord friend list              # 친구 목록
agent-discord friend add <user>        # 친구 추가
agent-discord friend remove <user>     # 친구 제거

# Read States (Wave 2)
agent-discord unread list              # 채널별 안읽은 상태

# Notes (Wave 2)
agent-discord note get <user>          # 유저 노트 조회
agent-discord note set <user> <note>   # 유저 노트 설정
```

---

## 파일 구조

```
src/platforms/
├── slack/
│   ├── client.ts          # SlackClient 클래스
│   ├── types.ts           # 타입 정의
│   └── commands/
│       ├── unread.ts      # ✅ 완료
│       ├── activity.ts    # Wave 2
│       └── saved.ts       # Wave 2
└── discord/
    ├── client.ts          # DiscordClient 클래스
    ├── types.ts           # 타입 정의
    └── commands/
        ├── dm.ts          # Wave 1
        ├── mention.ts     # Wave 1
        ├── friend.ts      # Wave 2
        ├── unread.ts      # Wave 2
        └── note.ts        # Wave 2
```

---

## 검증 계획

### 각 API별 테스트
1. curl로 직접 API 호출하여 응답 구조 확인
2. 타입 정의 작성
3. Client 메서드 구현
4. CLI 명령어 구현
5. 실제 호출 테스트
6. `bun typecheck` 통과 확인

### 회귀 테스트
- `bun test` 전체 통과
- 기존 명령어 정상 동작 확인
