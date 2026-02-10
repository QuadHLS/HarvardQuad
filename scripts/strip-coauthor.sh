#!/bin/sh
# Strip Co-authored-by: Cursor from commit message file (used as GIT_EDITOR during rebase)
msgfile="$1"
if [ -f "$msgfile" ]; then
  grep -v 'Co-authored-by: Cursor' "$msgfile" > "${msgfile}.tmp"
  mv "${msgfile}.tmp" "$msgfile"
fi
exit 0
