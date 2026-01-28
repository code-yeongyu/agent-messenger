#!/bin/bash
#
# post-message.sh - Send a message to Slack with error handling
#
# Usage:
#   ./post-message.sh <channel> <message>
#
# Example:
#   ./post-message.sh general "Hello from script!"
#   ./post-message.sh engineering "Deployment completed ✅"

set -euo pipefail

# Check arguments
if [ $# -lt 2 ]; then
  echo "Usage: $0 <channel> <message>"
  echo ""
  echo "Examples:"
  echo "  $0 general 'Hello world!'"
  echo "  $0 engineering 'Build completed'"
  exit 1
fi

CHANNEL="$1"
MESSAGE="$2"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to send message with retry logic
send_message() {
  local channel=$1
  local message=$2
  local max_attempts=3
  local attempt=1
  
  while [ $attempt -le $max_attempts ]; do
    echo -e "${YELLOW}Attempt $attempt/$max_attempts...${NC}"
    
    # Send message and capture result
    RESULT=$(agent-slack message send "$channel" "$message" 2>&1)
    
    # Check if successful
    if echo "$RESULT" | jq -e '.success' > /dev/null 2>&1; then
      echo -e "${GREEN}✓ Message sent successfully!${NC}"
      
      # Extract message details
      MSG_TS=$(echo "$RESULT" | jq -r '.data.ts')
      
      echo ""
      echo "Message details:"
      echo "  Channel: $channel"
      echo "  Timestamp: $MSG_TS"
      
      return 0
    fi
    
    # Extract error information
    if echo "$RESULT" | jq -e '.error' > /dev/null 2>&1; then
      ERROR_CODE=$(echo "$RESULT" | jq -r '.error.code // "UNKNOWN"')
      ERROR_MSG=$(echo "$RESULT" | jq -r '.error.message // "Unknown error"')
      
      echo -e "${RED}✗ Failed: $ERROR_MSG${NC}"
      
      # Don't retry on certain errors
      case "$ERROR_CODE" in
        "NO_WORKSPACE")
          echo ""
          echo "No workspace authenticated. Run:"
          echo "  agent-slack auth extract"
          return 1
          ;;
        "INVALID_CHANNEL")
          echo ""
          echo "Channel '$channel' not found. Check channel name or ID."
          return 1
          ;;
      esac
    else
      echo -e "${RED}✗ Unexpected error: $RESULT${NC}"
    fi
    
    # Exponential backoff before retry
    if [ $attempt -lt $max_attempts ]; then
      SLEEP_TIME=$((attempt * 2))
      echo "Retrying in ${SLEEP_TIME}s..."
      sleep $SLEEP_TIME
    fi
    
    attempt=$((attempt + 1))
  done
  
  echo -e "${RED}Failed after $max_attempts attempts${NC}"
  return 1
}

# Check if agent-slack is installed
if ! command -v agent-slack &> /dev/null; then
  echo -e "${RED}Error: agent-slack not found${NC}"
  echo ""
  echo "Install it with:"
  echo "  bun install -g agent-slack"
  exit 1
fi

# Check authentication
echo "Checking authentication..."
AUTH_STATUS=$(agent-slack auth status 2>&1)

if ! echo "$AUTH_STATUS" | jq -e '.success' > /dev/null 2>&1; then
  echo -e "${RED}Not authenticated!${NC}"
  echo ""
  echo "Run this to authenticate:"
  echo "  agent-slack auth extract"
  exit 1
fi

WORKSPACE_NAME=$(echo "$AUTH_STATUS" | jq -r '.data.workspace_name // "Unknown"')
echo -e "${GREEN}✓ Authenticated to: $WORKSPACE_NAME${NC}"
echo ""

# Send the message
echo "Sending message to #$CHANNEL..."
echo "Message: $MESSAGE"
echo ""

send_message "$CHANNEL" "$MESSAGE"
