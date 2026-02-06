#!/bin/bash
# Remove locks and sync IOS-branch. Run this after killing any suspended git (kill %1 in that terminal).
set -e
cd "$(dirname "$0")"

echo "1. Removing git lock files..."
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/IOS-branch.lock 2>/dev/null || true

echo "2. Pointing IOS-branch at origin/IOS-branch..."
git update-ref refs/heads/IOS-branch refs/remotes/origin/IOS-branch

echo "3. Resetting working tree (wait 1-2 min; do NOT press Ctrl+Z)..."
git reset --hard IOS-branch

echo "4. Done."
git rev-parse HEAD
git status
