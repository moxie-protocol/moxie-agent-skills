#!/bin/bash

echo "Passing arguments: $*"

# Base packages directory
PACKAGES_DIR="./packages"

# Check if the packages directory exists
if [ ! -d "$PACKAGES_DIR" ]; then
  echo "Error: Directory $PACKAGES_DIR does not exist."
  exit 1
fi

# List of working folders to watch (relative to $PACKAGES_DIR)
WORKING_FOLDERS=("client-direct") # Core is handled separately

# Initialize an array to hold package-specific commands
COMMANDS=()

# Ensure "core" package runs first
CORE_PACKAGE="$PACKAGES_DIR/core"
if [ -d "$CORE_PACKAGE" ]; then
  COMMANDS+=("pnpm --dir $CORE_PACKAGE dev -- $*")
else
  echo "Warning: 'core' package not found in $PACKAGES_DIR."
fi

# Process remaining working folders
for FOLDER in "${WORKING_FOLDERS[@]}"; do
  PACKAGE="$PACKAGES_DIR/$FOLDER"

  # Check if the folder exists and add the command
  if [ -d "$PACKAGE" ]; then
    COMMANDS+=("pnpm --dir $PACKAGE dev -- $*")
  else
    echo "Warning: '$FOLDER' folder not found in $PACKAGES_DIR."
  fi
done

# Add specific commands for other directories or cases
if [ -d "./client" ]; then
  COMMANDS+=("pnpm --dir client dev -- $*")
else
  echo "Warning: 'client' directory not found."
fi

if [ -d "./moxie-broadcasting-agent" ]; then
  # Build the watch paths dynamically from WORKING_FOLDERS
  WATCH_PATHS=()
  for FOLDER in "${WORKING_FOLDERS[@]}"; do
    WATCH_PATHS+=("--watch './packages/$FOLDER/dist'")
  done

  COMMANDS+=("nodemon ${WATCH_PATHS[@]} -e js,json,map --delay 2 --exec 'pnpm --dir moxie-broadcasting-agent dev -- $*'")
else
  echo "Warning: 'moxie-broadcasting-agent' directory not found."
fi

# Run build command first
if ! pnpm build; then
  echo "Build failed. Exiting."
  exit 1
fi

# Run all commands concurrently
if [ ${#COMMANDS[@]} -gt 0 ]; then
  npx concurrently --raw "${COMMANDS[@]}"
else
  echo "No valid packages to run."
fi
