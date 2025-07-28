@echo off
echo Compiling TypeScript...

REM 编译TypeScript
node_modules\.bin\tsc

if %errorlevel% neq 0 (
    echo TypeScript compilation failed
    exit /b 1
)

echo Compilation successful, running test...

REM 运行测试
node test_token_fix.cjs

echo Test completed 