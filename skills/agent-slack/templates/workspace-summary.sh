#!/bin/bash
#
# workspace-summary.sh - Generate a comprehensive workspace summary
#
# Usage:
#   ./workspace-summary.sh [--json]
#
# Options:
#   --json  Output raw JSON instead of formatted text
#
# Example:
#   ./workspace-summary.sh
#   ./workspace-summary.sh --json > summary.json

set -euo pipefail

OUTPUT_JSON=false
if [ $# -gt 0 ] && [ "$1" = "--json" ]; then
  OUTPUT_JSON=true
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

if ! command -v agent-slack &> /dev/null; then
  echo -e "${RED}Error: agent-slack not found${NC}" >&2
  echo "" >&2
  echo "Install it with:" >&2
  echo "  npm install -g agent-slack" >&2
  exit 1
fi

AUTH_STATUS=$(agent-slack auth status 2>&1)

if echo "$AUTH_STATUS" | jq -e '.error' > /dev/null 2>&1; then
  echo -e "${RED}Not authenticated!${NC}" >&2
  echo "" >&2
  echo "Run this to authenticate:" >&2
  echo "  agent-slack auth extract" >&2
  exit 1
fi

echo -e "${YELLOW}Fetching workspace snapshot...${NC}" >&2
SNAPSHOT=$(agent-slack snapshot 2>&1)

if echo "$SNAPSHOT" | jq -e '.error' > /dev/null 2>&1; then
  echo -e "${RED}Failed to get snapshot${NC}" >&2
  ERROR_MSG=$(echo "$SNAPSHOT" | jq -r '.error // "Unknown error"')
  echo -e "${RED}Error: $ERROR_MSG${NC}" >&2
  exit 1
fi

if [ "$OUTPUT_JSON" = true ]; then
  echo "$SNAPSHOT"
  exit 0
fi

WORKSPACE_NAME=$(echo "$SNAPSHOT" | jq -r '.workspace.name // "Unknown"')
WORKSPACE_ID=$(echo "$SNAPSHOT" | jq -r '.workspace.id // "Unknown"')

CHANNELS=$(echo "$SNAPSHOT" | jq '.channels // []')
CHANNEL_COUNT=$(echo "$CHANNELS" | jq 'length')
PUBLIC_COUNT=$(echo "$CHANNELS" | jq '[.[] | select(.is_private == false)] | length')
PRIVATE_COUNT=$(echo "$CHANNELS" | jq '[.[] | select(.is_private == true)] | length')

USERS=$(echo "$SNAPSHOT" | jq '.users // []')
USER_COUNT=$(echo "$USERS" | jq 'length')

MESSAGES=$(echo "$SNAPSHOT" | jq '.recent_messages // []')
MESSAGE_COUNT=$(echo "$MESSAGES" | jq 'length')

echo ""
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${BLUE}  Slack Workspace Summary${NC}"
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BOLD}Workspace:${NC} $WORKSPACE_NAME"
echo -e "${BOLD}ID:${NC}        $WORKSPACE_ID"
echo ""

echo -e "${BOLD}${CYAN}Channels (${CHANNEL_COUNT} total)${NC}"
echo -e "  Public:  $PUBLIC_COUNT"
echo -e "  Private: $PRIVATE_COUNT"
echo ""

echo -e "${BOLD}${CYAN}Channel List:${NC}"
echo "$CHANNELS" | jq -r '
  .[0:10] | 
  .[] | 
  "  #\(.name) (\(.id))"
'
if [ "$CHANNEL_COUNT" -gt 10 ]; then
  echo "  ... and $((CHANNEL_COUNT - 10)) more"
fi
echo ""

echo -e "${BOLD}${CYAN}Users (${USER_COUNT} total)${NC}"
echo ""

echo -e "${BOLD}${CYAN}Sample Users:${NC}"
echo "$USERS" | jq -r '
  .[0:10] | 
  .[] | 
  "  \(.name) - \(.real_name // "N/A") (\(.id))"
'
if [ "$USER_COUNT" -gt 10 ]; then
  echo "  ... and $((USER_COUNT - 10)) more"
fi
echo ""

echo -e "${BOLD}${CYAN}Recent Activity (${MESSAGE_COUNT} messages)${NC}"
echo ""

if [ "$MESSAGE_COUNT" -gt 0 ]; then
  echo -e "${BOLD}${CYAN}Latest Messages:${NC}"
  echo "$MESSAGES" | jq -r '
    .[0:5] | 
    .[] | 
    "  [\(.channel_name)] \(.username // "Unknown"): \(.text[0:60])\(if (.text | length) > 60 then "..." else "" end)"
  '
  echo ""
fi

echo -e "${BOLD}${CYAN}Quick Actions:${NC}"
echo ""
echo -e "  ${GREEN}# Send message to a channel${NC}"
FIRST_CHANNEL=$(echo "$CHANNELS" | jq -r '.[0].name // "general"')
echo -e "  agent-slack message send $FIRST_CHANNEL \"Hello!\""
echo ""
echo -e "  ${GREEN}# List recent messages in a channel${NC}"
echo -e "  agent-slack message list $FIRST_CHANNEL --limit 10"
echo ""
echo -e "  ${GREEN}# Get user info${NC}"
FIRST_USER=$(echo "$USERS" | jq -r '.[0].id // "U123"')
echo -e "  agent-slack user info $FIRST_USER"
echo ""

echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

SNAPSHOT_FILE="workspace-snapshot-$(date +%Y%m%d-%H%M%S).json"
echo "$SNAPSHOT" > "$SNAPSHOT_FILE"
echo -e "${GREEN}✓ Full snapshot saved to: $SNAPSHOT_FILE${NC}"
echo ""
