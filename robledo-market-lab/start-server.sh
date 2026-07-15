#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
echo "Robledo Market Lab: http://localhost:8000"
python3 -m http.server 8000
