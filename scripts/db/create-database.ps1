# Creates the app's PostgreSQL role and database from DATABASE_URL in backend/.env.
# Prompts for the postgres superuser password. Usage (from the repo root): npm run db:create

$ErrorActionPreference = 'Stop'

$envFile = Join-Path $PSScriptRoot '..\..\backend\.env'
if (-not (Test-Path $envFile)) {
  throw "backend/.env not found. Copy backend/.env.example to backend/.env and fill it in first."
}

$line = Get-Content $envFile | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1
if (-not $line) { throw 'DATABASE_URL is missing from backend/.env.' }

$url = ($line -replace '^\s*DATABASE_URL\s*=\s*', '').Trim().Trim('"')
if ($url -notmatch '^postgres(?:ql)?://([^:]+):([^@]+)@([^:/]+)(?::(\d+))?/([^?]+)') {
  throw 'DATABASE_URL must look like postgresql://user:password@host:port/database'
}
$appUser = [Uri]::UnescapeDataString($Matches[1])
$appPassword = [Uri]::UnescapeDataString($Matches[2])
$dbHost = $Matches[3]
$dbPort = if ($Matches[4]) { $Matches[4] } else { '5432' }
$appDb = $Matches[5]

$psql = Get-Command psql -ErrorAction SilentlyContinue
$psqlPath = if ($psql) { $psql.Source } else {
  Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $psqlPath) { throw 'psql not found. Install PostgreSQL or add its bin folder to PATH.' }

$sqlFile = Join-Path $PSScriptRoot 'create-database.sql'
Write-Host "Creating role '$appUser' and database '$appDb' on ${dbHost}:${dbPort}."
Write-Host 'Enter the password of the postgres superuser when asked.'

& $psqlPath -h $dbHost -p $dbPort -U postgres -d postgres -v ON_ERROR_STOP=1 `
  -v "app_user=$appUser" -v "app_password=$appPassword" -v "app_db=$appDb" -f $sqlFile
if ($LASTEXITCODE -ne 0) { throw "psql failed with exit code $LASTEXITCODE." }
