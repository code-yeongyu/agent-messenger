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

# Parse arguments
OUTPUT_JSON=false
if [ $# -gt 0 ] && [ "$1" = "--json" ]; then
  OUTPUT_JSON=true
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Check if agent-slack is installed
if ! command -v agent-slack &> /dev/null; then
  echo -e "${RED}Error: agent-slack not found${NC}" >&2
  echo "" >&2
  echo "Install it with:" >&2
  echo "  bun install -g agent-slack" >&2
  exit 1
fi

# Check authentication
AUTH_STATUS=$(agent-slack auth status 2>&1)

if ! echo "$AUTH_STATUS" | jq -e '.success' > /dev/null 2>&1; then
  echo -e "${RED}Not authenticated!${NC}" >&2
  echo "" >&2
  echo "Run this to authenticate:" >&2
  echo "  agent-slack auth extract" >&2
  exit 1
fi

# Get workspace snapshot
echo -e "${YELLOW}Fetching workspace snapshot...${NC}" >&2
SNAPSHOT=$(agent-slack snapshot 2>&1)

if ! echo "$SNAPSHOT" | jq -e '.success' > /dev/null 2>&1; then
  echo -e "${RED}Failed to get snapshot${NC}" >&2
  ERROR_MSG=$(echo "$SNAPSHOT" | jq -r '.error.message // "Unknown error"')
  echo -e "${RED}Error: $ERROR_MSG${NC}" >&2
  exit 1
fi

# If JSON output requested, just print and exit
if [ "$OUTPUT_JSON" = true ]; then
  echo "$SNAPSHOT" | jq '.data'
  exit 0
fi

# Extract data
WORKSPACE_NAME=$(echo "$SNAPSHOT" | jq -r '.data.workspace.name // "Unknown"')
WORKSPACE_ID=$(echo "$SNAPSHOT" | jq -r '.data.workspace.id // "Unknown"')

CHANNELS=$(echo "$SNAPSHOT" | jq '.data.channels // []')
CHANNEL_COUNT=$(echo "$CHANNELS" | jq 'length')
PUBLIC_COUNT=$(echo "$CHANNELS" | jq '[.[] | select(.is_channel == true)] | length')
PRIVATE_COUNT=$(echo "$CHANNELS" | jq '[.[] | select(.is_private == true)] | length')
DM_COUNT=$(echo "$CHANNELS" | jq '[.[] | select(.is_im == true)] | length')

USERS=$(echo "$SNAPSHOT" | jq '.data.users // []')
USER_COUNT=$(echo "$USERS" | jq 'length')

MESSAGES=$(echo "$SNAPSHOT" | jq '.data.messages // []')
MESSAGE_COUNT=$(echo "$MESSAGES" | jq 'length')

# Print formatted summary
echo ""
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${BLUE}  Slack Workspace Summary${NC}"
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BOLD}Workspace:${NC} $WORKSPACE_NAME"
echo -e "${BOLD}ID:${NC}        $WORKSPACE_ID"
echo ""

# Channels section
echo -e "${BOLD}${CYAN}Channels (${CHANNEL_COUNT} total)${NC}"
echo -e "  Public:  $PUBLIC_COUNT"
echo -e "  Private: $PRIVATE_COUNT"
echo -e "  DMs:     $DM_COUNT"
echo ""

# List top channels by message count
echo -e "${BOLD}${CYAN}Most Active Channels:${NC}"
echo "$CHANNELS" | jq -r '
  sort_by(.message_count) | 
  reverse | 
  .[0:5] | 
  .[] | 
  "  \(.ref) - #\(.name) (\(.message_count // 0) messages)"
'
echo ""

# Users section
echo -e "${BOLD}${CYAN}Users (${USER_COUNT} total)${NC}"
echo ""

# List some users
echo -e "${BOLD}${CYAN}Sample Users:${NC}"
echo "$USERS" | jq -r '
  .[0:10] | 
  .[] | 
  "  \(.ref) - \(.name) (\(.real_name // "N/A"))"
'
if [ "$USER_COUNT" -gt 10 ]; then
  echo "  ... and $((USER_COUNT - 10)) more"
fi
echo ""

# Recent activity section
echo -e "${BOLD}${CYAN}Recent Activity (${MESSAGE_COUNT} messages)${NC}"
echo ""

if [ "$MESSAGE_COUNT" -gt 0 ]; then
  echo -e "${BOLD}${CYAN}Latest Messages:${NC}"
  echo "$MESSAGES" | jq -r '
    .[0:5] | 
    .[] | 
    "  [\(.channel_name)] \(.user_name // "Unknown"): \(.text[0:60])\(if (.text | length) > 60 then "..." else "" end)"
  '
  echo ""
fi

# Refs summary
echo -e "${BOLD}${CYAN}Refs Summary:${NC}"
CHANNEL_REFS=$(echo "$SNAPSHOT" | jq -r '.data.refs.channels | keys | length')
MESSAGE_REFS=$(echo "$SNAPSHOT" | jq -r '.data.refs.messages | keys | length')
USER_REFS=$(echo "$SNAPSHOT" | jq -r '.data.refs.users | keys | length')

echo -e "  Channel refs: $CHANNEL_REFS (@c1 - @c${CHANNEL_REFS})"
echo -e "  Message refs: $MESSAGE_REFS (@m1 - @m${MESSAGE_REFS})"
echo -e "  User refs:    $USER_REFS (@u1 - @u${USER_REFS})"
echo ""

# Usage examples
echo -e "${BOLD}${CYAN}Quick Actions:${NC}"
echo ""
echo -e "  ${GREEN}# Send message to most active channel${NC}"
MOST_ACTIVE=$(echo "$CHANNELS" | jq -r 'sort_by(.message_count) | reverse | .[0].name')
echo -e "  agent-slack message send $MOST_ACTIVE \"Hello!\""
echo ""
echo -e "  ${GREEN}# List recent messages in a channel${NC}"
echo -e "  agent-slack message list $MOST_ACTIVE --limit 10"
echo ""
echo -e "  ${GREEN}# Get user info${NC}"
FIRST_USER=$(echo "$USERS" | jq -r '.[0].ref')
echo -e "  agent-slack user info $FIRST_USER"
echo ""

echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Save snapshot to file
SNAPSHOT_FILE="workspace-snapshot-$(date +%Y%m%d-%H%M%S).json"
echo "$SNAPSHOT" | jq '.data' > "$SNAPSHOT_FILE"
echo -e "${GREEN}✓ Full snapshot saved to: $SNAPSHOT_FILE${NC}"
echo ""
