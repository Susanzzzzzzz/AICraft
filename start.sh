#!/bin/bash
# AICraft 启动脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ "$1" = "android" ]; then
  echo "📱 构建 Android APK..."
  node build.js android
  exit 0
fi

echo "🔨 构建 AICraft..."
node build.js

# 启动 HTTP 服务器
echo "🌐 启动开发服务器 http://localhost:8080"
echo "   按 Ctrl+C 停止"

if command -v python3 &>/dev/null; then
  python3 -m http.server 8080 --bind 127.0.0.1
elif command -v python &>/dev/null; then
  python -m SimpleHTTPServer 8080
else
  echo "❌ 未找到 python，请安装后重试"
  exit 1
fi
