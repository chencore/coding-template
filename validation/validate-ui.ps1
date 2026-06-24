param(
    [string]$Root = (Resolve-Path ".").Path
)

$ErrorActionPreference = "Stop"

$failures = New-Object System.Collections.Generic.List[string]

function Add-Failure([string]$Message) {
    $failures.Add($Message) | Out-Null
}

$uiPath = Join-Path $Root "frontend/design.md"
if (-not (Test-Path -LiteralPath $uiPath)) {
    Add-Failure "Missing frontend/design.md"
}

$changesPath = Join-Path $Root "openspec/changes"
$uiKeywords = "(?i)\b(ui|ux|frontend|front-end|component|page|screen|layout|style|css|visual)\b|界面|页面|组件|样式|前端|交互|视觉|表单|按钮"

if (Test-Path -LiteralPath $changesPath) {
    $activeChanges = Get-ChildItem -LiteralPath $changesPath -Directory |
        Where-Object { $_.Name -ne "archive" }

    foreach ($change in $activeChanges) {
        $content = ""
        foreach ($fileName in @("proposal.md", "design.md", "tasks.md")) {
            $path = Join-Path $change.FullName $fileName
            if (Test-Path -LiteralPath $path) {
                $content += "`n" + (Get-Content -LiteralPath $path -Raw -Encoding UTF8)
            }
        }

        if ($content -notmatch $uiKeywords) {
            continue
        }

        $tasksPath = Join-Path $change.FullName "tasks.md"
        if (-not (Test-Path -LiteralPath $tasksPath)) {
            Add-Failure "UI change '$($change.Name)' is missing tasks.md"
            continue
        }

        $tasks = Get-Content -LiteralPath $tasksPath -Raw -Encoding UTF8
        if ($tasks -notmatch "(?m)^## UI Check\s*$") {
            Add-Failure "UI change '$($change.Name)' is missing '## UI Check'"
        }

        foreach ($required in @(
            "UI complexity level selected",
            "Existing pattern/component",
            "Visual values use tokens",
            "Required states are covered",
            "Keyboard access",
            "Screenshot or visual verification"
        )) {
            if ($tasks -notmatch [regex]::Escape($required)) {
                Add-Failure "UI change '$($change.Name)' UI Check is missing '$required'"
            }
        }
    }
}

if ($failures.Count -gt 0) {
    Write-Host "UI validation failed:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host "- $failure" -ForegroundColor Red
    }
    exit 1
}

Write-Host "UI validation passed." -ForegroundColor Green
