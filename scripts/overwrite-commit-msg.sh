#!/bin/sh
# Overwrite the commit message file (first argument) with our message only
printf '%s\n' "AuthCallback: handle PKCE code param for native OAuth redirect" > "$1"
