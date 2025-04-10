#!/bin/bash

# Store the original calling directory
ORIGINAL_DIR=$(pwd)

# Change to the script directory
SCRIPT_DIR=$(dirname "$0")
cd "$SCRIPT_DIR"

# Pass the calling directory and any user arguments to the Node.js application
npx tsx watch src/index.tsx "$ORIGINAL_DIR" "$@"
