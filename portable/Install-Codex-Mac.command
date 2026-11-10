#!/bin/zsh
set -eu
demo_root="$(cd "$(dirname "$0")" && pwd)"
case "$(uname -m)" in
  arm64) demo_node="$demo_root/runtime/macos-arm64/node" ;;
  x86_64) demo_node="$demo_root/runtime/macos-x64/node" ;;
  *) echo "Unsupported Mac architecture."; exit 1 ;;
esac
"$demo_node" "$demo_root/app/install-codex.mjs" || true
read "?Press Return to close."
