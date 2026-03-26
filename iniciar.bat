@echo off
echo ============================================================
echo   OBS OVERLAY - Agencia Boliviana de Correos
echo   Iniciando servidor...
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/2] Verificando base de datos...
if not exist "database\database.sqlite" (
    echo Creando base de datos SQLite...
    type nul > database\database.sqlite
    php artisan migrate --force
) else (
    echo Base de datos OK.
)

echo.
echo [2/2] Iniciando servidor web...
echo.
echo ============================================================
echo   PANEL DE CONTROL:  http://127.0.0.1:8000/control
echo   OVERLAY (OBS):     http://127.0.0.1:8000/overlay
echo ============================================================
echo.
echo Presiona Ctrl+C para detener el servidor.
echo.

php artisan serve --host=127.0.0.1 --port=8000
