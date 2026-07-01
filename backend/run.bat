@echo off
set PYTHONPATH=%~dp0.venv\Lib\site-packages
set PYTHON=C:\Users\SUPER\AppData\Roaming\uv\python\cpython-3.12.13-windows-x86_64-none\python.exe
cd /d %~dp0
%PYTHON% -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
