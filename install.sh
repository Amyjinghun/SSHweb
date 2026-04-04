#!/bin/bash

echo "=========================================="
echo "  Linux服务器群控系统 - 一键安装"
echo "=========================================="
echo

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "[1/5] 安装Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs -y
fi

echo "[2/5] 安装后端依赖..."
cd server
npm install --production
cd ..

echo "[3/5] 安装前端依赖并构建..."
cd client
npm install
npm run build
cd ..

echo "[4/5] 启动服务..."
echo
echo "=========================================="
echo "  安装完成!"
echo "  访问: http://$(hostname -I):3000"
echo "  默认账户: admin / admin123"
echo "=========================================="
echo

# 使用pm2后台运行
if command -v pm2 &> /dev/null; then
    cd server
    pm2 start index.js --name qunkong
    pm2 save
    pm2 startup
else
    echo "提示: 安装pm2可以后台运行: npm install -g pm2"
    echo "现在直接启动..."
    cd server
    node index.js
fi
