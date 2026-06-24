param(
    [string]$Root = (Resolve-Path ".").Path
)

$ErrorActionPreference = "Stop"

$failures = New-Object System.Collections.Generic.List[string]

function Add-Failure([string]$Message) {
    $failures.Add($Message) | Out-Null
}

$hardnessPath = Join-Path $Root "spec/hardness.md"
if (-not (Test-Path -LiteralPath $hardnessPath)) {
    Add-Failure "Missing spec/hardness.md"
}

$changesPath = Join-Path $Root "openspec/changes"
if (Test-Path -LiteralPath $changesPath) {
    $activeChanges = Get-ChildItem -LiteralPath $changesPath -Directory |
        Where-Object { $_.Name -ne "archive" }

    foreach ($change in $activeChanges) {
        $tasksPath = Join-Path $change.FullName "tasks.md"
        if (-not (Test-Path -LiteralPath $tasksPath)) {
            Add-Failure "Active change '$($change.Name)' is missing tasks.md"
            continue
        }

        $tasks = Get-Content -LiteralPath $tasksPath -Raw -Encoding UTF8
        if ($tasks -notmatch "(?m)^## Hardness Check\s*$") {
            Add-Failure "Active change '$($change.Name)' is missing '## Hardness Check'"
        }

        foreach ($required in @(
            "Complexity level selected",
            "Boundary is clear",
            "Failure behavior",
            "Core path",
            "Logs/metrics",
            "Rollback path"
        )) {
            if ($tasks -notmatch [regex]::Escape($required)) {
                Add-Failure "Active change '$($change.Name)' Hardness Check is missing '$required'"
            }
        }
    }
}

if ($failures.Count -gt 0) {
    Write-Host "Hardness validation failed:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host "- $failure" -ForegroundColor Red
    }
    exit 1
}

Write-Host "Hardness validation passed." -ForegroundColor Green
