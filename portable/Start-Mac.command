#!/bin/zsh
SCRIPT_DIR="${0:A:h}"
if [[ "$(uname -m)" == "arm64" ]]; then
  YANGU_NODE="$SCRIPT_DIR/runtime/macos-arm64/node"
else
  YANGU_NODE="$SCRIPT_DIR/runtime/macos-x64/node"
fi
if [[ ! -x "$YANGU_NODE" ]]; then
  print "运行文件不存在或没有执行权限。请完整解压，参照文件夹里的使用说明。"
  read "?按回车退出"
  exit 1
fi
"$YANGU_NODE" "$SCRIPT_DIR/app/server.mjs"
if [[ $? -ne 0 ]]; then
  read "?启动未完成。请查看上方提示，按回车退出"
fi
