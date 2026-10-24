#!/bin/bash
# Summarize the current team using a saved device-code work account.
# Usage: ./team-summary.sh [--json]
#   --json  Print the raw `snapshot --full` JSON instead of the text summary
set -euo pipefail
SNAPSHOT=$(agent-teams --account work snapshot --full)
if [ "${1:-}" = "--json" ]; then
  printf '%s\n' "$SNAPSHOT"
  exit 0
fi

printf '%s\n' "$SNAPSHOT" | jq -r '
  "Team: \(.team.name) (\(.team.id))",
  (if .team.description then "  \(.team.description)" else empty end),
  "",
  "Channels (\(.channels // [] | length)):",
  (.channels // [] | .[:10][] | "  #\(.name) (\(.id))"),
  (.channels // [] | length - 10 | select(. > 0) | "  ... and \(.) more"),
  "",
  "Members (\(.members // [] | length)):",
  (.members // [] | .[:10][] | "  \(.displayName)\(if .email then " <\(.email)>" else "" end)"),
  (.members // [] | length - 10 | select(. > 0) | "  ... and \(.) more"),
  "",
  "Recent activity:",
  (.recent_messages // [] | sort_by(.timestamp) | reverse | .[:10][]
    | "  [\(.timestamp)] #\(.channel_name) \(.author): \(.content | gsub("\\s+"; " ") | .[:120])")
'
