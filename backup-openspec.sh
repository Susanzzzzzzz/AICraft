#!/bin/bash
# 打包 openspec 目录到上级目录，带时间戳
# 用法：bash backup-openspec.sh

cd "$(dirname "$0")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="openspec_${TIMESTAMP}.tar.gz"
tar -czf "../${FILENAME}" openspec/
echo "已打包: ${FILENAME}"
echo "位置: $(cd .. && pwd)/${FILENAME}"
echo "大小: $(du -h "../${FILENAME}" | cut -f1)"
