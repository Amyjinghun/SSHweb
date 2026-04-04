@echo off
echo ========================================
echo   Linux服务器群控系统 - 启动脚本
echo ========================================
echo.

:: 检查Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未安装Node.js，请先安装Node.js
    pause
    exit /b 1
)

:: 安装后端依赖
echo [1/4] 安装后端依赖...
cd server
call npm install
if %errorlevel% neq 0 (
    echo [错误] 后端依赖安装失败
    pause
    exit /b 1
)
cd ..

:: 安装前端依赖
echo [2/4] 安装前端依赖...
cd client
call npm install
if %errorlevel% neq 0 (
    echo [错误] 前端依赖安装失败
    pause
    exit /b 1
)
cd ..

:: 构建前端
echo [3/4] 构建前端...
cd client
call npm run build
if %errorlevel% neq 0 (
    echo [错误] 前端构建失败
    pause
    exit /b 1
)
cd ..

:: 启动服务器
echo [4/4] 启动服务器...
echo.
echo ========================================
echo   服务已启动，请访问 http://localhost:3000
echo   默认管理员: admin / admin123
echo ========================================
echo.

cd server
node index.js
