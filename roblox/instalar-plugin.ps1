# Instala o plugin do Rojo no Roblox Studio (Windows).
# Uso, na pasta roblox:  powershell -ExecutionPolicy Bypass -File .\instalar-plugin.ps1

$ErrorActionPreference = "Stop"
$versao = "7.4.4"
$url = "https://github.com/rojo-rbx/rojo/releases/download/v$versao/Rojo.rbxm"
$pasta = Join-Path $env:LOCALAPPDATA "Roblox\Plugins"
$destino = Join-Path $pasta "Rojo.rbxm"

New-Item -ItemType Directory -Force -Path $pasta | Out-Null
Write-Host "A descarregar o plugin do Rojo $versao..."
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $url -OutFile $destino -UseBasicParsing

Write-Host ""
Write-Host "Plugin instalado em: $destino" -ForegroundColor Green
Write-Host "Fecha e volta a abrir o Roblox Studio. O Rojo aparece no separador Plugins."
