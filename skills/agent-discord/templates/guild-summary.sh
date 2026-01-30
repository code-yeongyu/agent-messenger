#!/bin/bash
#
# guild-summary.sh - Generate a comprehensive Discord guild summary
#
# Usage:
#   ./guild-summary.sh [--json]
#
# Options:
#   --json  Output raw JSON instead of formatted text
#
# Example:
#   ./guild-summary.sh
#   ./guild-summary.sh --json > summary.json

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

if ! command -v agent-discord &> /dev/null; then
  echo -e "${RED}Error: agent-discord not found${NC}" >&2
  echo "" >&2
  echo "Install it with:" >&2
  echo "  bun install -g agent-discord" >&2
  exit 1
fi

AUTH_STATUS=$(agent-discord auth status 2>&1)

if echo "$AUTH_STATUS" | jq -e '.error' > /dev/null 2>&1; then
  echo -e "${RED}Not authenticated!${NC}" >&2
  echo "" >&2
  echo "Run this to authenticate:" >&2
  echo "  agent-discord auth extract" >&2
  exit 1
fi

CURRENT_GUILD=$(echo "$AUTH_STATUS" | jq -r '.current_guild // ""')
if [ -z "$CURRENT_GUILD" ]; then
  echo -e "${RED}No guild selected!${NC}" >&2
  echo "" >&2
  echo "Run this to select a guild:" >&2
  echo "  agent-discord guild list" >&2
  echo "  agent-discord guild switch <guild-id>" >&2
  exit 1
fi

echo -e "${YELLOW}Fetching guild snapshot...${NC}" >&2
SNAPSHOT=$(agent-discord snapshot 2>&1)

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

GUILD_NAME=$(echo "$SNAPSHOT" | jq -r '.guild.name // "Unknown"')
GUILD_ID=$(echo "$SNAPSHOT" | jq -r '.guild.id // "Unknown"')

CHANNELS=$(echo "$SNAPSHOT" | jq '.channels // []')
CHANNEL_COUNT=$(echo "$CHANNELS" | jq 'length')
TEXT_COUNT=$(echo "$CHANNELS" | jq '[.[] | select(.type == 0)] | length')
VOICE_COUNT=$(echo "$CHANNELS" | jq '[.[] | select(.type == 2)] | length')
CATEGORY_COUNT=$(echo "$CHANNELS" | jq '[.[] | select(.type == 4)] | length')

MEMBERS=$(echo "$SNAPSHOT" | jq '.members // []')
MEMBER_COUNT=$(echo "$MEMBERS" | jq 'length')

MESSAGES=$(echo "$SNAPSHOT" | jq '.recent_messages // []')
MESSAGE_COUNT=$(echo "$MESSAGES" | jq 'length')

echo ""
echo -e "${BOLD}${BLUE}=====================================================${NC}"
echo -e "${BOLD}${BLUE}  Discord Guild Summary${NC}"
echo -e "${BOLD}${BLUE}=====================================================${NC}"
echo ""
echo -e "${BOLD}Guild:${NC}     $GUILD_NAME"
echo -e "${BOLD}ID:${NC}        $GUILD_ID"
echo ""

echo -e "${BOLD}${CYAN}Channels (${CHANNEL_COUNT} total)${NC}"
echo -e "  Text:       $TEXT_COUNT"
echo -e "  Voice:      $VOICE_COUNT"
echo -e "  Categories: $CATEGORY_COUNT"
echo ""

echo -e "${BOLD}${CYAN}Text Channels:${NC}"
echo "$CHANNELS" | jq -r '
  [.[] | select(.type == 0)] | 
  .[0:10] | 
  .[] | 
  "  #\(.name) (\(.id))"
'
if [ "$TEXT_COUNT" -gt 10 ]; then
  echo "  ... and $((TEXT_COUNT - 10)) more"
fi
echo ""

echo -e "${BOLD}${CYAN}Members (${MEMBER_COUNT} shown)${NC}"
echo ""

echo -e "${BOLD}${CYAN}Sample Members:${NC}"
echo "$MEMBERS" | jq -r '
  .[0:10] | 
  .[] | 
  "  \(.username) \(if .global_name then "(\(.global_name))" else "" end) [\(.id)]"
'
if [ "$MEMBER_COUNT" -gt 10 ]; then
  echo "  ... and $((MEMBER_COUNT - 10)) more"
fi
echo ""

echo -e "${BOLD}${CYAN}Recent Activity (${MESSAGE_COUNT} messages)${NC}"
echo ""

if [ "$MESSAGE_COUNT" -gt 0 ]; then
  echo -e "${BOLD}${CYAN}Latest Messages:${NC}"
  echo "$MESSAGES" | jq -r '
    .[0:5] | 
    .[] | 
    "  [#\(.channel_name)] \(.author): \(.content[0:50])\(if (.content | length) > 50 then "..." else "" end)"
  '
  echo ""
fi

echo -e "${BOLD}${CYAN}Quick Actions:${NC}"
echo ""
echo -e "  ${GREEN}# Send message to a channel${NC}"
FIRST_CHANNEL=$(echo "$CHANNELS" | jq -r '[.[] | select(.type == 0)][0].id // "CHANNEL_ID"')
FIRST_CHANNEL_NAME=$(echo "$CHANNELS" | jq -r '[.[] | select(.type == 0)][0].name // "general"')
echo -e "  agent-discord message send $FIRST_CHANNEL \"Hello!\""
echo ""
echo -e "  ${GREEN}# List messages in #$FIRST_CHANNEL_NAME${NC}"
echo -e "  agent-discord message list $FIRST_CHANNEL --limit 10"
echo ""
echo -e "  ${GREEN}# Get user info${NC}"
FIRST_USER=$(echo "$MEMBERS" | jq -r '.[0].id // "USER_ID"')
echo -e "  agent-discord user info $FIRST_USER"
echo ""
echo -e "  ${GREEN}# Switch to another guild${NC}"
echo -e "  agent-discord guild list"
echo -e "  agent-discord guild switch <guild-id>"
echo ""

echo -e "${BOLD}${BLUE}=====================================================${NC}"
echo ""

SNAPSHOT_FILE="guild-snapshot-$(date +%Y%m%d-%H%M%S).json"
echo "$SNAPSHOT" > "$SNAPSHOT_FILE"
echo -e "${GREEN}Full snapshot saved to: $SNAPSHOT_FILE${NC}"
echo ""
