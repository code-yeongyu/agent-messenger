#!/bin/bash
#
# team-summary.sh - Generate a comprehensive Microsoft Teams team summary
#
# Usage:
#   ./team-summary.sh [--json]
#
# Options:
#   --json  Output raw JSON instead of formatted text
#
# Example:
#   ./team-summary.sh
#   ./team-summary.sh --json > summary.json
#
# NOTE: Teams tokens expire in 60-90 minutes! This script handles token refresh.

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

# Function to refresh token if needed
refresh_token_if_needed() {
  local status
  status=$(agent-teams auth status 2>&1)
  
  if echo "$status" | jq -e '.error' > /dev/null 2>&1; then
    echo -e "${YELLOW}Token expired, refreshing...${NC}" >&2
    agent-teams auth extract >&2
    return 0
  fi
  
  local expires_soon
  expires_soon=$(echo "$status" | jq -r '.token_expires_soon // false')
  
  if [ "$expires_soon" = "true" ]; then
    echo -e "${YELLOW}Token expiring soon, refreshing...${NC}" >&2
    agent-teams auth extract >&2
  fi
}

if ! command -v agent-teams &> /dev/null; then
  echo -e "${RED}Error: agent-teams not found${NC}" >&2
  echo "" >&2
  echo "Install it with:" >&2
  echo "  bun install -g agent-teams" >&2
  exit 1
fi

# Check and refresh token
refresh_token_if_needed

AUTH_STATUS=$(agent-teams auth status 2>&1)

if echo "$AUTH_STATUS" | jq -e '.error' > /dev/null 2>&1; then
  echo -e "${RED}Not authenticated!${NC}" >&2
  echo "" >&2
  echo "Run this to authenticate:" >&2
  echo "  agent-teams auth extract" >&2
  exit 1
fi

CURRENT_TEAM=$(echo "$AUTH_STATUS" | jq -r '.current_team // ""')
TOKEN_AGE=$(echo "$AUTH_STATUS" | jq -r '.token_age_minutes // "unknown"')

if [ -z "$CURRENT_TEAM" ]; then
  echo -e "${RED}No team selected!${NC}" >&2
  echo "" >&2
  echo "Run this to select a team:" >&2
  echo "  agent-teams team list" >&2
  echo "  agent-teams team switch <team-id>" >&2
  exit 1
fi

echo -e "${YELLOW}Fetching team snapshot...${NC}" >&2
echo -e "Token age: ${TOKEN_AGE} minutes" >&2
SNAPSHOT=$(agent-teams snapshot 2>&1)

# Handle token expiry during snapshot
if echo "$SNAPSHOT" | grep -qi "expired\|401\|unauthorized" 2>/dev/null; then
  echo -e "${YELLOW}Token expired during snapshot, refreshing...${NC}" >&2
  agent-teams auth extract >&2
  SNAPSHOT=$(agent-teams snapshot 2>&1)
fi

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

TEAM_NAME=$(echo "$SNAPSHOT" | jq -r '.team.name // "Unknown"')
TEAM_ID=$(echo "$SNAPSHOT" | jq -r '.team.id // "Unknown"')

CHANNELS=$(echo "$SNAPSHOT" | jq '.channels // []')
CHANNEL_COUNT=$(echo "$CHANNELS" | jq 'length')
STANDARD_COUNT=$(echo "$CHANNELS" | jq '[.[] | select(.type == "standard")] | length')
PRIVATE_COUNT=$(echo "$CHANNELS" | jq '[.[] | select(.type == "private")] | length')

MEMBERS=$(echo "$SNAPSHOT" | jq '.members // []')
MEMBER_COUNT=$(echo "$MEMBERS" | jq 'length')

MESSAGES=$(echo "$SNAPSHOT" | jq '.recent_messages // []')
MESSAGE_COUNT=$(echo "$MESSAGES" | jq 'length')

echo ""
echo -e "${BOLD}${BLUE}=====================================================${NC}"
echo -e "${BOLD}${BLUE}  Microsoft Teams Summary${NC}"
echo -e "${BOLD}${BLUE}=====================================================${NC}"
echo ""
echo -e "${BOLD}Team:${NC}        $TEAM_NAME"
echo -e "${BOLD}ID:${NC}          $TEAM_ID"
echo -e "${BOLD}Token Age:${NC}   ${TOKEN_AGE} minutes (expires at ~60-90 min)"
echo ""

echo -e "${BOLD}${CYAN}Channels (${CHANNEL_COUNT} total)${NC}"
echo -e "  Standard:   $STANDARD_COUNT"
echo -e "  Private:    $PRIVATE_COUNT"
echo ""

echo -e "${BOLD}${CYAN}Channels:${NC}"
echo "$CHANNELS" | jq -r '
  .[0:10] | 
  .[] | 
  "  #\(.name) (\(.id[0:30])...)"
'
if [ "$CHANNEL_COUNT" -gt 10 ]; then
  echo "  ... and $((CHANNEL_COUNT - 10)) more"
fi
echo ""

echo -e "${BOLD}${CYAN}Members (${MEMBER_COUNT} shown)${NC}"
echo ""

echo -e "${BOLD}${CYAN}Sample Members:${NC}"
echo "$MEMBERS" | jq -r '
  .[0:10] | 
  .[] | 
  "  \(.displayName) \(if .email then "(\(.email))" else "" end)"
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
FIRST_CHANNEL=$(echo "$CHANNELS" | jq -r '.[0].id // "CHANNEL_ID"')
FIRST_CHANNEL_NAME=$(echo "$CHANNELS" | jq -r '.[0].name // "General"')
echo -e "  agent-teams message send \"$FIRST_CHANNEL\" \"Hello!\""
echo ""
echo -e "  ${GREEN}# List messages in #$FIRST_CHANNEL_NAME${NC}"
echo -e "  agent-teams message list \"$FIRST_CHANNEL\" --limit 10"
echo ""
echo -e "  ${GREEN}# Get user info${NC}"
FIRST_USER=$(echo "$MEMBERS" | jq -r '.[0].id // "USER_ID"')
echo -e "  agent-teams user info \"$FIRST_USER\""
echo ""
echo -e "  ${GREEN}# Switch to another team${NC}"
echo -e "  agent-teams team list"
echo -e "  agent-teams team switch <team-id>"
echo ""
echo -e "  ${GREEN}# Refresh token (expires in 60-90 min!)${NC}"
echo -e "  agent-teams auth extract"
echo ""

echo -e "${BOLD}${BLUE}=====================================================${NC}"
echo ""

SNAPSHOT_FILE="team-snapshot-$(date +%Y%m%d-%H%M%S).json"
echo "$SNAPSHOT" > "$SNAPSHOT_FILE"
echo -e "${GREEN}Full snapshot saved to: $SNAPSHOT_FILE${NC}"
echo ""

# Warn if token is getting old
if [ "$TOKEN_AGE" != "unknown" ] && [ "$TOKEN_AGE" -gt 45 ]; then
  echo -e "${YELLOW}WARNING: Token is ${TOKEN_AGE} minutes old. Consider refreshing soon!${NC}"
  echo -e "${YELLOW}Run: agent-teams auth extract${NC}"
  echo ""
fi
