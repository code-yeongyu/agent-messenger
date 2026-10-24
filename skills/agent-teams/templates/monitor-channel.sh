#!/bin/bash
# Read-only polling sample, not a complete archive collector.
# Usage: ./monitor-channel.sh <team-id> <channel-id> [interval]
# Sign in with auth login first. CLI silently refreshes the same account.
# Prints each message once; IDs already printed are skipped on later polls.
set -euo pipefail
if [ "$#" -lt 2 ]; then echo "Usage: $0 <team-id> <channel-id> [interval]" >&2; exit 1; fi
TEAM_ID="$1"
CHANNEL_ID="$2"
INTERVAL="${3:-10}"
if ! [[ "$INTERVAL" =~ ^[1-9][0-9]*$ ]]; then echo 'Interval must be a positive integer' >&2; exit 1; fi
SEEN=$(mktemp)
trap 'rm -f "$SEEN"' EXIT
while true; do
  # Errors stop polling. Reconnect explicitly with auth login when required.
  agent-teams --account work message list "$TEAM_ID" "$CHANNEL_ID" --limit 20 \
    | jq -c --rawfile seen "$SEEN" '($seen | split("\n")) as $ids | sort_by(.timestamp) | .[] | select(.id as $id | $ids | index($id) | not)' \
    | while IFS= read -r MESSAGE; do
        printf '%s\n' "$MESSAGE"
        printf '%s\n' "$MESSAGE" | jq -r '.id' >> "$SEEN"
      done
  sleep "$INTERVAL"
done
