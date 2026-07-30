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
        $tasksPath = Join-Path $change.FullName "tasks.md"

        # 显式豁免：tasks.md 含 not-ui 标记的变更跳过 UI 校验
        # （用于修复 UI 校验器本身等"内容含 UI 关键词但非前端界面变更"的场景）
        if (Test-Path -LiteralPath $tasksPath) {
            $tasksRaw = Get-Content -LiteralPath $tasksPath -Raw -Encoding UTF8
            if ($tasksRaw -match "(?i)<!--\s*not-ui\s*:") {
                continue
            }
        }

        $content = ""
        foreach ($fileName in @("proposal.md", "design.md", "tasks.md")) {
            $path = Join-Path $change.FullName $fileName
            if (Test-Path -LiteralPath $path) {
                $content += "`n" + (Get-Content -LiteralPath $path -Raw -Encoding UTF8)
            }
        }

        # 剥离反引号行内代码（`...`）——路径/目录名引用不参与 UI 关键词分类，
        # 否则引用 examples/standard-ui-change 等目录名会误判为 UI 变更
        $content = $content -replace '`[^`]*`', ' '

        if ($content -notmatch $uiKeywords) {
            continue
        }

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
