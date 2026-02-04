#!/bin/bash
#
# post-message.sh - Send a message to Discord with error handling
#
# Usage:
#   ./post-message.sh <channel-id> <message>
#   ./post-message.sh --channel-name <name> <message>
#
# Example:
#   ./post-message.sh 1234567890123456789 "Hello from script!"
#   ./post-message.sh --channel-name general "Deployment completed"

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
CHANNEL_ID=""
CHANNEL_NAME=""
MESSAGE=""

if [ $# -lt 2 ]; then
  echo "Usage: $0 <channel-id> <message>"
  echo "       $0 --channel-name <name> <message>"
  echo ""
  echo "Examples:"
  echo "  $0 1234567890123456789 'Hello world!'"
  echo "  $0 --channel-name general 'Build completed'"
  exit 1
fi

if [ "$1" = "--channel-name" ]; then
  CHANNEL_NAME="$2"
  MESSAGE="$3"
else
  CHANNEL_ID="$1"
  MESSAGE="$2"
fi

# Function to send message with retry logic
send_message() {
  local channel_id=$1
  local message=$2
  local max_attempts=3
  local attempt=1
  
  while [ $attempt -le $max_attempts ]; do
    echo -e "${YELLOW}Attempt $attempt/$max_attempts...${NC}"
    
    # Send message and capture result
    RESULT=$(agent-discord message send "$channel_id" "$message" 2>&1)
    
    # Check if successful (has an 'id' field)
    if echo "$RESULT" | jq -e '.id' > /dev/null 2>&1; then
      echo -e "${GREEN}Message sent successfully!${NC}"
      
      # Extract message details
      MSG_ID=$(echo "$RESULT" | jq -r '.id')
      
      echo ""
      echo "Message details:"
      echo "  Channel: $channel_id"
      echo "  Message ID: $MSG_ID"
      
      return 0
    fi
    
    # Extract error information
    if echo "$RESULT" | jq -e '.error' > /dev/null 2>&1; then
      ERROR_MSG=$(echo "$RESULT" | jq -r '.error // "Unknown error"')
      echo -e "${RED}Failed: $ERROR_MSG${NC}"
      
      # Don't retry on certain errors
      if echo "$ERROR_MSG" | grep -q "Not authenticated"; then
        echo ""
        echo "Not authenticated. Run:"
        echo "  agent-discord auth extract"
        return 1
      fi
      
      if echo "$ERROR_MSG" | grep -q "Unknown Channel"; then
        echo ""
        echo "Channel '$channel_id' not found. Check channel ID."
        echo "List channels with: agent-discord channel list"
        return 1
      fi
    else
      echo -e "${RED}Unexpected error: $RESULT${NC}"
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

# Check if agent-discord is installed
if ! command -v agent-discord &> /dev/null; then
  echo -e "${RED}Error: agent-discord not found${NC}"
  echo ""
  echo "Install it with:"
  echo "  bun install -g agent-discord"
  exit 1
fi

# Check authentication
echo "Checking authentication..."
AUTH_STATUS=$(agent-discord auth status 2>&1)

if echo "$AUTH_STATUS" | jq -e '.error' > /dev/null 2>&1; then
  echo -e "${RED}Not authenticated!${NC}"
  echo ""
  echo "Run this to authenticate:"
  echo "  agent-discord auth extract"
  exit 1
fi

USER_NAME=$(echo "$AUTH_STATUS" | jq -r '.user // "Unknown"')
SERVER_ID=$(echo "$AUTH_STATUS" | jq -r '.current_server // ""')
echo -e "${GREEN}Authenticated as: $USER_NAME${NC}"

if [ -z "$SERVER_ID" ]; then
  echo -e "${RED}No server selected!${NC}"
  echo ""
  echo "Run this to select a server:"
  echo "  agent-discord server list"
  echo "  agent-discord server switch <server-id>"
  exit 1
fi

# If channel name provided, look up channel ID
if [ -n "$CHANNEL_NAME" ]; then
  echo "Looking up channel #$CHANNEL_NAME..."
  CHANNELS=$(agent-discord channel list 2>&1)
  
  if echo "$CHANNELS" | jq -e '.error' > /dev/null 2>&1; then
    echo -e "${RED}Failed to list channels${NC}"
    exit 1
  fi
  
  CHANNEL_ID=$(echo "$CHANNELS" | jq -r --arg name "$CHANNEL_NAME" '.[] | select(.name==$name) | .id')
  
  if [ -z "$CHANNEL_ID" ]; then
    echo -e "${RED}Channel #$CHANNEL_NAME not found${NC}"
    echo ""
    echo "Available channels:"
    echo "$CHANNELS" | jq -r '.[] | "  #\(.name) (\(.id))"'
    exit 1
  fi
  
  echo -e "${GREEN}Found channel: $CHANNEL_ID${NC}"
fi

echo ""

# Send the message
echo "Sending message to channel $CHANNEL_ID..."
echo "Message: $MESSAGE"
echo ""

send_message "$CHANNEL_ID" "$MESSAGE"
