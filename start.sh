#!/bin/bash

echo "========================================"
echo "  Linux服务器群控系统 - 启动脚本"
echo "========================================"
echo

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "[错误] 未安装Node.js，请先安装Node.js"
    exit 1
fi

# 安装后端依赖
echo "[1/4] 安装后端依赖..."
cd server
npm install
if [ $? -ne 0 ]; then
    echo "[错误] 后端依赖安装失败"
    exit 1
fi
cd ..

# 安装前端依赖
echo "[2/4] 安装前端依赖..."
cd client
npm install
if [ $? -ne 0 ]; then
    echo "[错误] 前端依赖安装失败"
    exit 1
fi
cd ..

# 构建前端
echo "[3/4] 构建前端..."
cd client
npm run build
if [ $? -ne 0 ]; then
    echo "[错误] 前端构建失败"
    exit 1
fi
cd ..

# 启动服务器
echo "[4/4] 启动服务器..."
echo
echo "========================================"
echo "  服务已启动，请访问 http://localhost:3000"
echo "  默认管理员: admin / admin123"
echo "========================================"
echo

cd server
node index.js
