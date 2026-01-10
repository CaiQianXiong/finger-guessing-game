#!/bin/bash

# 停止占用8080端口的进程
echo "正在停止旧服务器..."
lsof -ti:8080 | xargs kill -9 2>/dev/null
sleep 1

# 启动新服务器
echo "正在启动服务器..."
cd "$(dirname "$0")"
python3 -m http.server 8080 > /dev/null 2>&1 &

# 等待服务器启动
sleep 2

# 检查服务器是否启动成功
if lsof -ti:8080 > /dev/null; then
    echo "✅ 服务器启动成功！"
    echo "🌐 访问地址: http://localhost:8080"
    echo "按 Ctrl+C 停止服务器"
    # 保持脚本运行
    wait
else
    echo "❌ 服务器启动失败"
    exit 1
fi

