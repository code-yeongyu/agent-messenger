#!/bin/bash
#
# monitor-channel.sh - Monitor a Microsoft Teams channel for new messages
#
# Usage:
#   ./monitor-channel.sh <channel-id> [interval]
#
# Arguments:
#   channel-id - Channel ID to monitor (use 'channel list' to find IDs)
#   interval   - Polling interval in seconds (default: 10)
#
# Example:
#   ./monitor-channel.sh "19:abc123@thread.tacv2"
#   ./monitor-channel.sh "19:abc123@thread.tacv2" 5
#
# NOTE: Teams tokens expire in 60-90 minutes! This script handles automatic refresh.

set -euo pipefail

# Check arguments
if [ $# -lt 1 ]; then
  echo "Usage: $0 <channel-id> [interval]"
  echo ""
  echo "Examples:"
  echo "  $0 '19:abc123@thread.tacv2'          # Monitor channel, poll every 10s"
  echo "  $0 '19:abc123@thread.tacv2' 5        # Monitor channel, poll every 5s"
  echo ""
  echo "To find channel IDs, run: agent-teams channel list"
  echo ""
  echo "NOTE: Teams tokens expire in 60-90 minutes - this script auto-refreshes!"
  exit 1
fi

CHANNEL_ID="$1"
INTERVAL="${2:-10}"  # Default 10 seconds

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# State tracking
LAST_ID=""
FIRST_RUN=true
LAST_TOKEN_CHECK=$(date +%s)
TOKEN_CHECK_INTERVAL=300  # Check token every 5 minutes

# Function to format ISO timestamp to readable format
format_time() {
  local ts=$1
  # Handle ISO 8601 format
  if command -v gdate &> /dev/null; then
    gdate -d "$ts" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "$ts"
  else
    date -d "$ts" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "$ts"
  fi
}

# Function to truncate text
truncate_text() {
  local text=$1
  local max_length=100
  
  if [ ${#text} -gt $max_length ]; then
    echo "${text:0:$max_length}..."
  else
    echo "$text"
  fi
}

# Function to refresh token if needed (TEAMS-SPECIFIC)
refresh_token_if_needed() {
  local now=$(date +%s)
  local elapsed=$((now - LAST_TOKEN_CHECK))
  
  # Only check periodically to avoid API spam
  if [ $elapsed -lt $TOKEN_CHECK_INTERVAL ]; then
    return 0
  fi
  
  LAST_TOKEN_CHECK=$now
  
  echo -e "${YELLOW}Checking token validity...${NC}"
  
  local status
  status=$(agent-teams auth status 2>&1)
  
  # Check if token is expired or expiring soon
  if echo "$status" | jq -e '.error' > /dev/null 2>&1; then
    echo -e "${YELLOW}Token expired, refreshing...${NC}"
    agent-teams auth extract
    return 0
  fi
  
  local expires_soon
  expires_soon=$(echo "$status" | jq -r '.token_expires_soon // false')
  local token_age
  token_age=$(echo "$status" | jq -r '.token_age_minutes // 0')
  
  if [ "$expires_soon" = "true" ]; then
    echo -e "${YELLOW}Token expiring soon (${token_age} min old), refreshing...${NC}"
    agent-teams auth extract
  else
    echo -e "${GREEN}Token valid (${token_age} min old)${NC}"
  fi
}

# Function to check for new messages
check_messages() {
  # Get latest message
  MESSAGES=$(agent-teams message list "$CHANNEL_ID" --limit 1 2>&1)
  
  # Check for token expiry error
  if echo "$MESSAGES" | grep -Eqi "expired|401|unauthorized" 2>/dev/null; then
    echo -e "${YELLOW}Token expired during operation, refreshing...${NC}"
    agent-teams auth extract
    # Retry
    MESSAGES=$(agent-teams message list "$CHANNEL_ID" --limit 1 2>&1)
  fi
  
  # Check if successful
  if echo "$MESSAGES" | jq -e '.error' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$MESSAGES" | jq -r '.error // "Unknown error"')
    echo -e "${RED}Error: $ERROR_MSG${NC}"
    return 1
  fi
  
  # Extract latest message
  LATEST_ID=$(echo "$MESSAGES" | jq -r '.[0].id // ""')
  
  # No messages in channel
  if [ -z "$LATEST_ID" ]; then
    if [ "$FIRST_RUN" = true ]; then
      echo -e "${YELLOW}No messages in channel yet${NC}"
    fi
    return 0
  fi
  
  # Check if new message
  if [ "$LATEST_ID" != "$LAST_ID" ]; then
    # Skip notification on first run (just initialize)
    if [ "$FIRST_RUN" = false ] && [ -n "$LAST_ID" ]; then
      # Extract message details
      CONTENT=$(echo "$MESSAGES" | jq -r '.[0].content // ""')
      AUTHOR=$(echo "$MESSAGES" | jq -r '.[0].author // "Unknown"')
      TIMESTAMP=$(echo "$MESSAGES" | jq -r '.[0].timestamp // ""')
      
      # Format timestamp
      TIME=$(format_time "$TIMESTAMP")
      
      # Display new message
      echo ""
      echo -e "${GREEN}----------------------------------------------${NC}"
      echo -e "${BLUE}New message in channel${NC}"
      echo -e "${GREEN}----------------------------------------------${NC}"
      echo -e "Time:    $TIME"
      echo -e "From:    $AUTHOR"
      echo -e "Message: $(truncate_text "$CONTENT")"
      echo -e "${GREEN}----------------------------------------------${NC}"
      
      # Example: Auto-respond to keywords
      # Uncomment to enable
      # if echo "$CONTENT" | grep -qi "bot"; then
      #   echo -e "${YELLOW}Detected keyword, responding...${NC}"
      #   agent-teams message send "$CHANNEL_ID" "You called?"
      # fi
    fi
    
    LAST_ID="$LATEST_ID"
  fi
  
  FIRST_RUN=false
  return 0
}

# Check if agent-teams is installed
if ! command -v agent-teams &> /dev/null; then
  echo -e "${RED}Error: agent-teams not found${NC}"
  echo ""
  echo "Install it with:"
  echo "  bun install -g agent-teams"
  exit 1
fi

# Check authentication and refresh if needed
echo "Checking authentication..."
refresh_token_if_needed

AUTH_STATUS=$(agent-teams auth status 2>&1)

if echo "$AUTH_STATUS" | jq -e '.error' > /dev/null 2>&1; then
  echo -e "${RED}Not authenticated!${NC}"
  echo ""
  echo "Run this to authenticate:"
  echo "  agent-teams auth extract"
  exit 1
fi

USER_NAME=$(echo "$AUTH_STATUS" | jq -r '.user // "Unknown"')
TOKEN_AGE=$(echo "$AUTH_STATUS" | jq -r '.token_age_minutes // "unknown"')
echo -e "${GREEN}Authenticated as: $USER_NAME${NC}"
echo -e "Token age: ${TOKEN_AGE} minutes"
echo ""

# Verify channel exists
echo "Verifying channel..."
CHANNEL_INFO=$(agent-teams channel info "$CHANNEL_ID" 2>&1)

if echo "$CHANNEL_INFO" | jq -e '.error' > /dev/null 2>&1; then
  echo -e "${RED}Channel '$CHANNEL_ID' not found${NC}"
  echo ""
  echo "List available channels with:"
  echo "  agent-teams channel list"
  exit 1
fi

CHANNEL_NAME=$(echo "$CHANNEL_INFO" | jq -r '.name // "Unknown"')
echo -e "${GREEN}Monitoring: #$CHANNEL_NAME ($CHANNEL_ID)${NC}"
echo ""

# Start monitoring
echo -e "${YELLOW}Monitoring for new messages (polling every ${INTERVAL}s)...${NC}"
echo -e "${YELLOW}Token will be auto-refreshed before expiry (60-90 min limit)${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Trap Ctrl+C for clean exit
trap 'echo -e "\n${YELLOW}Monitoring stopped${NC}"; exit 0' INT

# Main monitoring loop
while true; do
  # Proactively refresh token before it expires
  refresh_token_if_needed
  
  check_messages
  sleep "$INTERVAL"
done
