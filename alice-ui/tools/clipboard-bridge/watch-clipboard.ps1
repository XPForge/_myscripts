param(
    [string]$ConfigPath = "",
    [switch]$Once,
    [switch]$CaptureOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$DefaultConfig = [ordered]@{
    repoPath = "."
    pollIntervalMs = 1000
    taskOutputFile = "ALICE_TO_CODEX_TASK.md"
    runtimeFolder = ".codex-bridge"
    copyConfirmationToClipboard = $true
    executionEnabled = $true
    codexExePath = ""
    codexSandbox = "workspace-write"
    codexAskForApproval = "never"
    copyReportToClipboard = $true
    reportTimeoutSeconds = 900
    showNotifications = $true
    notificationDurationMs = 3000
}

function Resolve-BridgePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BasePath,
        [Parameter(Mandatory = $true)]
        [string]$PathValue
    )

    if ([System.IO.Path]::IsPathRooted($PathValue)) {
        return [System.IO.Path]::GetFullPath($PathValue)
    }

    return [System.IO.Path]::GetFullPath((Join-Path $BasePath $PathValue))
}

function Get-BridgeConfig {
    param([string]$Path)

    $config = [ordered]@{}
    foreach ($key in $DefaultConfig.Keys) {
        $config[$key] = $DefaultConfig[$key]
    }

    if ($Path -and (Test-Path -LiteralPath $Path)) {
        $rawConfig = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
        foreach ($property in $rawConfig.PSObject.Properties) {
            if ($config.Contains($property.Name)) {
                $config[$property.Name] = $property.Value
            }
        }
    }

    if ($config.pollIntervalMs -lt 250) {
        throw "pollIntervalMs must be at least 250."
    }

    if ($config.reportTimeoutSeconds -lt 1) {
        throw "reportTimeoutSeconds must be at least 1."
    }

    if ($config.notificationDurationMs -lt 500) {
        throw "notificationDurationMs must be at least 500."
    }

    return $config
}

function Write-Utf8File {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Content
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function ConvertTo-SafeStatusTimestamp {
    param($Value)

    if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value)) { return $null }
    try { return ([datetimeoffset]::Parse([string]$Value)).ToUniversalTime().ToString("o") } catch { return $null }
}

function ConvertTo-SafeStatusErrorKind {
    param($Value)

    $label = [string]$Value
    if ($label -match '^[a-z0-9-]{1,48}$') { return $label }
    return $null
}

function Write-BridgeDisplayStatus {
    param(
        [Parameter(Mandatory = $true)]
        [string]$StatusPath,
        [Parameter(Mandatory = $true)]
        [ValidateSet("stopped", "capture-only-idle", "execution-idle", "task-captured", "codex-running", "codex-finished", "codex-failed", "unknown")]
        [string]$State,
        [Parameter(Mandatory = $true)]
        [ValidateSet("capture-only", "execution-enabled", "unknown")]
        [string]$Mode,
        [string]$EventTimeField = "",
        [string]$ErrorKind = ""
    )

    $existing = $null
    if (Test-Path -LiteralPath $StatusPath) {
        try {
            $existing = Get-Content -LiteralPath $StatusPath -Raw | ConvertFrom-Json
        }
        catch {
            $existing = $null
        }
    }

    $now = (Get-Date).ToUniversalTime().ToString("o")
    $status = [ordered]@{
        schemaVersion = 1
        state = $State
        mode = $Mode
        updatedAt = $now
        lastTaskAt = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "lastTaskAt") { ConvertTo-SafeStatusTimestamp $existing.lastTaskAt } else { $null }
        lastReportAt = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "lastReportAt") { ConvertTo-SafeStatusTimestamp $existing.lastReportAt } else { $null }
        lastErrorAt = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "lastErrorAt") { ConvertTo-SafeStatusTimestamp $existing.lastErrorAt } else { $null }
        lastErrorKind = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "lastErrorKind") { ConvertTo-SafeStatusErrorKind $existing.lastErrorKind } else { $null }
    }

    if ($EventTimeField -in @("lastTaskAt", "lastReportAt", "lastErrorAt")) {
        $status[$EventTimeField] = $now
    }
    if ($State -in @("capture-only-idle", "execution-idle", "codex-finished")) {
        $status.lastErrorAt = $null
        $status.lastErrorKind = $null
    }
    if ($State -eq "codex-failed") {
        $safeErrorKind = if ($ErrorKind -match '^[a-z0-9-]{1,48}$') { $ErrorKind } else { "execution-failed" }
        $status.lastErrorKind = $safeErrorKind
    }

    $temporaryPath = "$StatusPath.tmp"
    Write-Utf8File -Path $temporaryPath -Content ($status | ConvertTo-Json)
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        try {
            Move-Item -LiteralPath $temporaryPath -Destination $StatusPath -Force
            return
        }
        catch {
            if ($attempt -eq 5) { throw }
            Start-Sleep -Milliseconds 50
        }
    }
}

function Get-Sha256 {
    param([Parameter(Mandatory = $true)][string]$Text)

    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $hashBytes = $sha.ComputeHash($bytes)
        return ([System.BitConverter]::ToString($hashBytes) -replace "-", "").ToLowerInvariant()
    }
    finally {
        $sha.Dispose()
    }
}

function Get-CodexBlock {
    param([Parameter(Mandatory = $true)][string]$Text)

    $lines = [System.Text.RegularExpressions.Regex]::Split($Text, "\r\n|\n|\r")
    $startIndex = -1

    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i].StartsWith("@codex")) {
            $startIndex = $i
            break
        }
    }

    if ($startIndex -lt 0) {
        return $null
    }

    $blockLines = New-Object System.Collections.Generic.List[string]

    for ($i = $startIndex; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        $endIndex = $line.IndexOf("@endcodex", [System.StringComparison]::Ordinal)

        if ($endIndex -ge 0) {
            $blockLines.Add($line.Substring(0, $endIndex + "@endcodex".Length))
            return [string]::Join("`r`n", $blockLines)
        }

        $blockLines.Add($line)
    }

    return $null
}

function Write-BridgeLog {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LogDirectory,
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    $date = Get-Date -Format "yyyyMMdd"
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logPath = Join-Path $LogDirectory "$date.log"
    Add-Content -LiteralPath $logPath -Value "[$timestamp] $Message"
}

function Show-BridgeNotification {
    param(
        [Parameter(Mandatory = $true)]
        [System.Collections.IDictionary]$Config,
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    Write-Host $Message

    if (-not $Config.showNotifications) {
        return
    }

    try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
        Add-Type -AssemblyName System.Drawing -ErrorAction Stop

        $notifyIcon = New-Object System.Windows.Forms.NotifyIcon
        $notifyIcon.Icon = [System.Drawing.SystemIcons]::Information
        $notifyIcon.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
        $notifyIcon.BalloonTipTitle = "Lighthouse Bridge"
        $notifyIcon.BalloonTipText = $Message
        $notifyIcon.Visible = $true
        $notifyIcon.ShowBalloonTip([int]$Config.notificationDurationMs)

        $disposeTimer = New-Object System.Windows.Forms.Timer
        $disposeTimer.Interval = [Math]::Max([int]$Config.notificationDurationMs + 500, 1000)
        $disposeTimer.Add_Tick({
            $disposeTimer.Stop()
            $notifyIcon.Visible = $false
            $notifyIcon.Dispose()
            $disposeTimer.Dispose()
        })
        $disposeTimer.Start()
    }
    catch {
        Write-Host "Notification unavailable; console status shown."
    }
}

function Get-SeenHashes {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return @{}
    }

    $hashes = @{}
    foreach ($line in Get-Content -LiteralPath $Path) {
        $hash = $line.Trim()
        if ($hash) {
            $hashes[$hash] = $true
        }
    }
    return $hashes
}

function Add-SeenHash {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string]$Hash
    )

    Add-Content -LiteralPath $Path -Value $Hash
}

function Add-SuppressedClipboardHash {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$SuppressedHashes,
        [Parameter(Mandatory = $true)]
        [string]$Text,
        [Parameter(Mandatory = $true)]
        [string]$Reason,
        [Parameter(Mandatory = $true)]
        [string]$LogDirectory
    )

    $hash = Get-Sha256 -Text $Text
    $SuppressedHashes[$hash] = $Reason
    Write-BridgeLog -LogDirectory $LogDirectory -Message "clipboard content suppressed hash=$hash reason=$Reason"
}

function Set-BridgeClipboard {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$SuppressedHashes,
        [Parameter(Mandatory = $true)]
        [string]$Text,
        [Parameter(Mandatory = $true)]
        [string]$Reason,
        [Parameter(Mandatory = $true)]
        [string]$LogDirectory
    )

    Set-Clipboard -Value $Text
    Add-SuppressedClipboardHash -SuppressedHashes $SuppressedHashes -Text $Text -Reason $Reason -LogDirectory $LogDirectory
}

function Get-TimestampedPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Directory,
        [Parameter(Mandatory = $true)]
        [string]$Suffix
    )

    do {
        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $path = Join-Path $Directory "$timestamp-$Suffix"
        if (-not (Test-Path -LiteralPath $path)) {
            return $path
        }
        Start-Sleep -Milliseconds 1000
    } while ($true)
}

function Quote-ProcessArgument {
    param([Parameter(Mandatory = $true)][string]$Value)

    if ($Value -notmatch '[\s"]') {
        return $Value
    }

    return '"' + ($Value -replace '"', '\"') + '"'
}

function Resolve-CodexExecutable {
    param([Parameter(Mandatory = $true)][System.Collections.IDictionary]$Config)

    $configuredPath = [string]$Config.codexExePath
    if (-not [string]::IsNullOrWhiteSpace($configuredPath)) {
        if ([System.IO.Path]::IsPathRooted($configuredPath) -and (Test-Path -LiteralPath $configuredPath -PathType Leaf)) {
            return [System.IO.Path]::GetFullPath($configuredPath)
        }

        throw "Codex executable not found. Set codexExePath in config.local.json."
    }

    $codexCommand = Get-Command codex -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -ne $codexCommand -and $codexCommand.Path -and (Test-Path -LiteralPath $codexCommand.Path -PathType Leaf)) {
        return [System.IO.Path]::GetFullPath([string]$codexCommand.Path)
    }

    throw "Codex executable not found. Set codexExePath in config.local.json."
}

function Invoke-CodexCli {
    param(
        [Parameter(Mandatory = $true)]
        [System.Collections.IDictionary]$Config,
        [Parameter(Mandatory = $true)]
        [string]$RepoPath,
        [Parameter(Mandatory = $true)]
        [string]$TaskText,
        [Parameter(Mandatory = $true)]
        [string]$ReportPath,
        [Parameter(Mandatory = $true)]
        [string]$LogDirectory
    )

    try {
        $codexExePath = Resolve-CodexExecutable -Config $Config
    }
    catch {
        $failureMessage = $_.Exception.Message
        Write-BridgeLog -LogDirectory $LogDirectory -Message "codex executable resolution failed error=$failureMessage"
        return [pscustomobject]@{
            Success = $false
            ExitCode = $null
            ReportText = $null
            FailureMessage = $failureMessage
        }
    }

    $arguments = @(
        "--ask-for-approval", ([string]$Config.codexAskForApproval),
        "exec",
        "--cd", $RepoPath,
        "--sandbox", ([string]$Config.codexSandbox),
        "--output-last-message", $ReportPath,
        "-"
    )

    $quotedArguments = ($arguments | ForEach-Object { Quote-ProcessArgument -Value ([string]$_) }) -join " "
    $timeoutMs = [int]$Config.reportTimeoutSeconds * 1000

    Write-BridgeLog -LogDirectory $LogDirectory -Message "codex invocation start executable=$codexExePath report=$ReportPath"

    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = $codexExePath
    $processInfo.Arguments = $quotedArguments
    $processInfo.WorkingDirectory = $RepoPath
    $processInfo.UseShellExecute = $false
    $processInfo.RedirectStandardInput = $true
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true
    $processInfo.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $processInfo

    try {
        [void]$process.Start()
        $process.StandardInput.Write($TaskText)
        $process.StandardInput.Close()

        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()

        $completed = $process.WaitForExit($timeoutMs)
        if (-not $completed) {
            $process.Kill()
            $process.WaitForExit()
            [void]$stdoutTask.Result
            [void]$stderrTask.Result
            $failureMessage = "Lighthouse Clipboard Bridge: Codex invocation timed out after $($Config.reportTimeoutSeconds) seconds."
            Write-BridgeLog -LogDirectory $LogDirectory -Message "codex invocation timeout exitCode=timeout report=$ReportPath"
            return [pscustomobject]@{
                Success = $false
                ExitCode = $null
                ReportText = $null
                FailureMessage = $failureMessage
            }
        }

        $process.WaitForExit()
        $exitCode = $process.ExitCode
        [void]$stdoutTask.Result
        [void]$stderrTask.Result
        Write-BridgeLog -LogDirectory $LogDirectory -Message "codex invocation end exitCode=$exitCode report=$ReportPath"

        if ($exitCode -eq 0 -and (Test-Path -LiteralPath $ReportPath)) {
            $reportText = Get-Content -LiteralPath $ReportPath -Raw
            return [pscustomobject]@{
                Success = $true
                ExitCode = $exitCode
                ReportText = $reportText
                FailureMessage = $null
            }
        }

        $failureMessage = "Lighthouse Clipboard Bridge: Codex invocation failed"
        if ($null -ne $exitCode) {
            $failureMessage = "$failureMessage with exit code $exitCode"
        }
        $failureMessage = "$failureMessage. See .codex-bridge/logs/ for details."

        if (-not (Test-Path -LiteralPath $ReportPath)) {
            Write-BridgeLog -LogDirectory $LogDirectory -Message "codex report missing report=$ReportPath"
        }

        return [pscustomobject]@{
            Success = $false
            ExitCode = $exitCode
            ReportText = $null
            FailureMessage = $failureMessage
        }
    }
    catch {
        $failureMessage = "Lighthouse Clipboard Bridge: Codex invocation failed before completion. See .codex-bridge/logs/ for details."
        Write-BridgeLog -LogDirectory $LogDirectory -Message "codex invocation exception report=$ReportPath kind=process-exception"
        return [pscustomobject]@{
            Success = $false
            ExitCode = $null
            ReportText = $null
            FailureMessage = $failureMessage
        }
    }
    finally {
        $process.Dispose()
    }
}

function Get-ClipboardTextSafe {
    try {
        return Get-Clipboard -Raw -Format Text
    }
    catch {
        try {
            return Get-Clipboard -Raw
        }
        catch {
            return $null
        }
    }
}

$config = Get-BridgeConfig -Path $ConfigPath
if ($CaptureOnly) {
    $config.executionEnabled = $false
}
$baseForRepo = (Get-Location).Path
$repoPath = Resolve-BridgePath -BasePath $baseForRepo -PathValue ([string]$config.repoPath)

if (-not (Test-Path -LiteralPath $repoPath)) {
    throw "repoPath does not exist: $repoPath"
}

$taskOutputPath = Resolve-BridgePath -BasePath $repoPath -PathValue ([string]$config.taskOutputFile)
$runtimePath = Resolve-BridgePath -BasePath $repoPath -PathValue ([string]$config.runtimeFolder)
$tasksPath = Join-Path $runtimePath "tasks"
$logsPath = Join-Path $runtimePath "logs"
$reportsPath = Join-Path $runtimePath "reports"
$seenHashesPath = Join-Path $runtimePath "seen-hashes.txt"
$displayStatusPath = Join-Path $repoPath ".codex-bridge\status.json"

New-Item -ItemType Directory -Force -Path $tasksPath, $logsPath, $reportsPath | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $displayStatusPath) | Out-Null
if (-not (Test-Path -LiteralPath $seenHashesPath)) {
    Write-Utf8File -Path $seenHashesPath -Content ""
}

if ($config.executionEnabled) {
    Write-Host "Lighthouse Clipboard Bridge running with Codex execution enabled."
}
else {
    Write-Host "Lighthouse Clipboard Bridge running in capture-only mode."
}
Write-Host "Repo: $repoPath"
Write-Host "Press Ctrl+C to stop."

$suppressedClipboardHashes = @{}
$executionInProgress = $false
$bridgeMode = if ($config.executionEnabled) { "execution-enabled" } else { "capture-only" }
$idleState = if ($config.executionEnabled) { "execution-idle" } else { "capture-only-idle" }
Write-BridgeDisplayStatus -StatusPath $displayStatusPath -State $idleState -Mode $bridgeMode

try {
do {
    $clipboardText = Get-ClipboardTextSafe
    $clipboardHash = if ($null -ne $clipboardText) { Get-Sha256 -Text $clipboardText } else { $null }

    if ($null -ne $clipboardHash -and $suppressedClipboardHashes.ContainsKey($clipboardHash)) {
        Write-BridgeLog -LogDirectory $logsPath -Message "ignored suppressed clipboard content hash=$clipboardHash reason=$($suppressedClipboardHashes[$clipboardHash])"
        $codexBlock = $null
    }
    elseif ($executionInProgress) {
        Write-BridgeLog -LogDirectory $logsPath -Message "ignored clipboard content while codex execution in progress hash=$clipboardHash"
        $codexBlock = $null
    }
    elseif ($null -ne $clipboardText) {
        $codexBlock = Get-CodexBlock -Text $clipboardText
    }
    else {
        $codexBlock = $null
    }

    if ($null -ne $codexBlock) {
        $hash = Get-Sha256 -Text $codexBlock
        $seenHashes = Get-SeenHashes -Path $seenHashesPath

        if ($seenHashes.ContainsKey($hash)) {
            Write-BridgeLog -LogDirectory $logsPath -Message "duplicate task skipped hash=$hash"
        }
        else {
            $archivePath = Get-TimestampedPath -Directory $tasksPath -Suffix "task.md"

            Write-Utf8File -Path $taskOutputPath -Content $codexBlock
            Write-Utf8File -Path $archivePath -Content $codexBlock
            Add-SeenHash -Path $seenHashesPath -Hash $hash
            Write-BridgeLog -LogDirectory $logsPath -Message "task captured hash=$hash output=$taskOutputPath archive=$archivePath"
            Write-BridgeDisplayStatus -StatusPath $displayStatusPath -State "task-captured" -Mode $bridgeMode -EventTimeField "lastTaskAt"
            Show-BridgeNotification -Config $config -Message "Lighthouse Bridge: task captured"

            if ($config.copyConfirmationToClipboard) {
                Set-BridgeClipboard -SuppressedHashes $suppressedClipboardHashes -Text "Lighthouse Clipboard Bridge: task captured and written to ALICE_TO_CODEX_TASK.md" -Reason "capture-confirmation" -LogDirectory $logsPath
            }

            Write-Host "Task captured: $archivePath"

            if ($config.executionEnabled) {
                $reportPath = Get-TimestampedPath -Directory $reportsPath -Suffix "report.md"
                Show-BridgeNotification -Config $config -Message "Lighthouse Bridge: Codex executing..."
                $executionInProgress = $true
                Write-BridgeDisplayStatus -StatusPath $displayStatusPath -State "codex-running" -Mode $bridgeMode
                try {
                    $codexResult = Invoke-CodexCli -Config $config -RepoPath $repoPath -TaskText $codexBlock -ReportPath $reportPath -LogDirectory $logsPath
                }
                finally {
                    $executionInProgress = $false
                }

                $postExecutionClipboardText = Get-ClipboardTextSafe
                if ($null -ne $postExecutionClipboardText) {
                    $postExecutionBlock = Get-CodexBlock -Text $postExecutionClipboardText
                    if ($null -ne $postExecutionBlock -and (Get-Sha256 -Text $postExecutionBlock) -ne $hash) {
                        Add-SuppressedClipboardHash -SuppressedHashes $suppressedClipboardHashes -Text $postExecutionClipboardText -Reason "task-copied-during-execution" -LogDirectory $logsPath
                    }
                }

                if ($codexResult.Success) {
                    Write-BridgeDisplayStatus -StatusPath $displayStatusPath -State "codex-finished" -Mode $bridgeMode -EventTimeField "lastReportAt"
                    Write-Host "Codex report written: $reportPath"
                    if ($config.copyReportToClipboard) {
                        Set-BridgeClipboard -SuppressedHashes $suppressedClipboardHashes -Text $codexResult.ReportText -Reason "codex-report" -LogDirectory $logsPath
                    }
                    Show-BridgeNotification -Config $config -Message "Lighthouse Bridge: Codex finished. Report copied to clipboard."
                }
                else {
                    Write-BridgeDisplayStatus -StatusPath $displayStatusPath -State "codex-failed" -Mode $bridgeMode -EventTimeField "lastErrorAt" -ErrorKind "codex-execution-failed"
                    Write-Host $codexResult.FailureMessage
                    Set-BridgeClipboard -SuppressedHashes $suppressedClipboardHashes -Text $codexResult.FailureMessage -Reason "codex-failure" -LogDirectory $logsPath
                    Show-BridgeNotification -Config $config -Message "Lighthouse Bridge: Codex failed. See log."
                }
            }
        }
    }

    if (-not $Once) {
        Start-Sleep -Milliseconds ([int]$config.pollIntervalMs)
    }
} while (-not $Once)
}
finally {
    Write-BridgeDisplayStatus -StatusPath $displayStatusPath -State "stopped" -Mode $bridgeMode
}
