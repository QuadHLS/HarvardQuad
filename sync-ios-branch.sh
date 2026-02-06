#!/bin/bash
# Make local IOS-branch match origin/IOS-branch exactly.
set -e
cd "$(dirname "$0")"

echo "Removing any git lock files..."
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/IOS-branch.lock 2>/dev/null || true

echo "Pointing IOS-branch at origin/IOS-branch..."
git update-ref refs/heads/IOS-branch refs/remotes/origin/IOS-branch

echo "Resetting working tree (may take 1–2 min, no output until done)..."
git reset --hard IOS-branch

echo "Done. IOS-branch now matches origin/IOS-branch."
git rev-parse HEAD
git status
