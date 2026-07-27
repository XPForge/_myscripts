param(
    [string]$ConfigPath = "",
    [switch]$Once,
    [switch]$CaptureOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$DefaultConfig = [ordered]@{
    repoPath = "."
    appPath = "alice-ui"
    pollIntervalMs = 1000
    taskOutputFile = "ALICE_TO_CODEX_TASK.md"
    runtimeFolder = ".codex-bridge"
    copyConfirmationToClipboard = $true
    executionEnabled = $true
    codexExePath = ""
    codexSandbox = "workspace-write"
    codexWritableRoots = @()
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

function Get-StatusProperty {
    param(
        $Object,
        [Parameter(Mandatory = $true)]
        [string]$Name,
        $Default = $null
    )

    if ($null -ne $Object -and $Object.PSObject.Properties.Name -contains $Name) {
        return $Object.$Name
    }

    return $Default
}

function ConvertTo-SafeStatusLabel {
    param(
        $Value,
        [int]$MaxLength = 128
    )

    if ($null -eq $Value) { return $null }

    $label = ([string]$Value).Trim()
    if ([string]::IsNullOrWhiteSpace($label)) { return $null }

    $label = ($label -replace '[\r\n\t]', ' ')
    if ($label.Length -gt $MaxLength) {
        $label = $label.Substring(0, $MaxLength)
    }

    if ($label -match '^[A-Za-z0-9_.: -]+$') { return $label }
    return $null
}

function ConvertTo-SafeStatusPath {
    param($Value)

    if ($null -eq $Value) { return $null }

    $pathValue = ([string]$Value).Trim()
    if ([string]::IsNullOrWhiteSpace($pathValue)) { return $null }
    if ($pathValue.Length -gt 260) { return $pathValue.Substring(0, 260) }
    return $pathValue
}

function ConvertTo-SafeStatusSummary {
    param($Value)

    if ($null -eq $Value) { return $null }

    $summary = ([string]$Value).Trim()
    if ([string]::IsNullOrWhiteSpace($summary)) { return $null }

    $summary = ($summary -replace '[\r\n\t]+', ' ')
    if ($summary.Length -gt 300) {
        $summary = $summary.Substring(0, 300)
    }

    return $summary
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
        [string]$TaskId = "",
        $CodexPid = $null,
        [string]$TaskStartedAt = "",
        [string]$TaskCompletedAt = "",
        [string]$OutputPath = "",
        [string]$LastTaskStatus = "",
        [string]$ErrorSummary = "",
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
    $safeTaskId = ConvertTo-SafeStatusLabel -Value $TaskId
    $safeTaskStartedAt = ConvertTo-SafeStatusTimestamp $TaskStartedAt
    $safeTaskCompletedAt = ConvertTo-SafeStatusTimestamp $TaskCompletedAt
    $safeOutputPath = ConvertTo-SafeStatusPath $OutputPath
    $safeTaskStatus = ConvertTo-SafeStatusLabel -Value $LastTaskStatus -MaxLength 64
    $safeErrorSummary = ConvertTo-SafeStatusSummary $ErrorSummary
    $safeCodexPid = $null
    if ($null -ne $CodexPid -and [string]$CodexPid -match '^\d+$') {
        $safeCodexPid = [int]$CodexPid
    }

    $previousCurrentTaskId = ConvertTo-SafeStatusLabel -Value (Get-StatusProperty -Object $existing -Name "currentTaskId")
    $previousCurrentTaskStartedAt = ConvertTo-SafeStatusTimestamp (Get-StatusProperty -Object $existing -Name "currentTaskStartedAt")
    $previousCurrentOutputPath = ConvertTo-SafeStatusPath (Get-StatusProperty -Object $existing -Name "currentOutputPath")
    $previousCurrentCodexPid = Get-StatusProperty -Object $existing -Name "currentCodexPid"
    if ($null -ne $previousCurrentCodexPid -and [string]$previousCurrentCodexPid -notmatch '^\d+$') {
        $previousCurrentCodexPid = $null
    }
    elseif ($null -ne $previousCurrentCodexPid) {
        $previousCurrentCodexPid = [int]$previousCurrentCodexPid
    }

    $previousLastTaskId = ConvertTo-SafeStatusLabel -Value (Get-StatusProperty -Object $existing -Name "lastTaskId")
    $previousLastTaskStatus = ConvertTo-SafeStatusLabel -Value (Get-StatusProperty -Object $existing -Name "lastTaskStatus") -MaxLength 64
    $previousLastTaskStartedAt = ConvertTo-SafeStatusTimestamp (Get-StatusProperty -Object $existing -Name "lastTaskStartedAt")
    $previousLastTaskCompletedAt = ConvertTo-SafeStatusTimestamp (Get-StatusProperty -Object $existing -Name "lastTaskCompletedAt")
    $previousLastOutputPath = ConvertTo-SafeStatusPath (Get-StatusProperty -Object $existing -Name "lastOutputPath")
    $previousLastErrorSummary = ConvertTo-SafeStatusSummary (Get-StatusProperty -Object $existing -Name "lastErrorSummary")

    $currentTaskId = $previousCurrentTaskId
    $currentTaskStartedAt = $previousCurrentTaskStartedAt
    $currentOutputPath = $previousCurrentOutputPath
    $currentCodexPid = $previousCurrentCodexPid
    $lastTaskId = $previousLastTaskId
    $lastTaskStatus = $previousLastTaskStatus
    $lastTaskStartedAt = $previousLastTaskStartedAt
    $lastTaskCompletedAt = $previousLastTaskCompletedAt
    $lastOutputPath = $previousLastOutputPath
    $lastErrorSummary = $previousLastErrorSummary

    switch ($State) {
        "task-captured" {
            $currentTaskId = if ($safeTaskId) { $safeTaskId } else { $previousCurrentTaskId }
            $currentTaskStartedAt = if ($safeTaskStartedAt) { $safeTaskStartedAt } else { $now }
            $currentOutputPath = if ($safeOutputPath) { $safeOutputPath } else { $previousCurrentOutputPath }
            $currentCodexPid = $null
            $lastTaskId = $currentTaskId
            $lastTaskStatus = if ($safeTaskStatus) { $safeTaskStatus } else { "task-detected" }
            $lastTaskStartedAt = $currentTaskStartedAt
            $lastOutputPath = $currentOutputPath
            $lastErrorSummary = $null
        }
        "codex-running" {
            $currentTaskId = if ($safeTaskId) { $safeTaskId } else { $previousCurrentTaskId }
            $currentTaskStartedAt = if ($safeTaskStartedAt) { $safeTaskStartedAt } else { $previousCurrentTaskStartedAt }
            $currentOutputPath = if ($safeOutputPath) { $safeOutputPath } else { $previousCurrentOutputPath }
            $currentCodexPid = if ($null -ne $safeCodexPid) { $safeCodexPid } else { $previousCurrentCodexPid }
            $lastTaskId = $currentTaskId
            $lastTaskStatus = if ($safeTaskStatus) { $safeTaskStatus } else { "codex-running" }
            $lastTaskStartedAt = $currentTaskStartedAt
            $lastOutputPath = $currentOutputPath
            $lastErrorSummary = $null
        }
        "codex-finished" {
            $completedTaskId = if ($safeTaskId) { $safeTaskId } else { $previousCurrentTaskId }
            $lastTaskId = if ($completedTaskId) { $completedTaskId } else { $previousLastTaskId }
            $lastTaskStatus = if ($safeTaskStatus) { $safeTaskStatus } else { "codex-completed" }
            $lastTaskStartedAt = if ($safeTaskStartedAt) { $safeTaskStartedAt } else { $previousCurrentTaskStartedAt }
            $lastTaskCompletedAt = if ($safeTaskCompletedAt) { $safeTaskCompletedAt } else { $now }
            $lastOutputPath = if ($safeOutputPath) { $safeOutputPath } else { $previousCurrentOutputPath }
            $lastErrorSummary = $null
            $currentTaskId = $null
            $currentTaskStartedAt = $null
            $currentOutputPath = $null
            $currentCodexPid = $null
        }
        "codex-failed" {
            $failedTaskId = if ($safeTaskId) { $safeTaskId } else { $previousCurrentTaskId }
            $lastTaskId = if ($failedTaskId) { $failedTaskId } else { $previousLastTaskId }
            $lastTaskStatus = if ($safeTaskStatus) { $safeTaskStatus } else { "codex-failed" }
            $lastTaskStartedAt = if ($safeTaskStartedAt) { $safeTaskStartedAt } else { $previousCurrentTaskStartedAt }
            $lastTaskCompletedAt = if ($safeTaskCompletedAt) { $safeTaskCompletedAt } else { $now }
            $lastOutputPath = if ($safeOutputPath) { $safeOutputPath } else { $previousCurrentOutputPath }
            $lastErrorSummary = $safeErrorSummary
            $currentTaskId = $null
            $currentTaskStartedAt = $null
            $currentOutputPath = $null
            $currentCodexPid = $null
        }
        "stopped" {
            $currentTaskId = $null
            $currentTaskStartedAt = $null
            $currentOutputPath = $null
            $currentCodexPid = $null
        }
        default {
            if ($State -in @("capture-only-idle", "execution-idle")) {
                $currentTaskId = $null
                $currentTaskStartedAt = $null
                $currentOutputPath = $null
                $currentCodexPid = $null
            }
        }
    }

    $status = [ordered]@{
        schemaVersion = 1
        source = "watcher"
        state = $State
        mode = $Mode
        executionMode = $Mode
        updatedAt = $now
        watcherPid = $PID
        currentTaskId = $currentTaskId
        currentCodexPid = $currentCodexPid
        currentTaskStartedAt = $currentTaskStartedAt
        currentOutputPath = $currentOutputPath
        lastTaskId = $lastTaskId
        lastTaskStatus = $lastTaskStatus
        lastTaskStartedAt = $lastTaskStartedAt
        lastTaskCompletedAt = $lastTaskCompletedAt
        lastOutputPath = $lastOutputPath
        lastErrorSummary = $lastErrorSummary
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

function Get-CodexTaskId {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Text,
        [Parameter(Mandatory = $true)]
        [string]$Hash
    )

    $match = [System.Text.RegularExpressions.Regex]::Match($Text, '(?im)^\s*task_id\s*:\s*(?<id>[^\r\n]+)\s*$')
    if ($match.Success) {
        $safeTaskId = ConvertTo-SafeStatusLabel -Value $match.Groups["id"].Value
        if ($safeTaskId) {
            return $safeTaskId
        }
    }

    if ($Hash.Length -ge 12) {
        return "hash:$($Hash.Substring(0, 12))"
    }

    return "hash:$Hash"
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

function Resolve-CodexWritableRoots {
    param(
        [Parameter(Mandatory = $true)]
        [System.Collections.IDictionary]$Config,
        [Parameter(Mandatory = $true)]
        [string]$RepoPath
    )

    $roots = New-Object System.Collections.Generic.List[string]
    $configuredRoots = @($Config.codexWritableRoots)

    if ($configuredRoots.Count -eq 0) {
        $roots.Add($RepoPath)
    }
    else {
        foreach ($root in $configuredRoots) {
            if ($null -eq $root -or [string]::IsNullOrWhiteSpace([string]$root)) {
                continue
            }
            $roots.Add((Resolve-BridgePath -BasePath $RepoPath -PathValue ([string]$root)))
        }
    }

    $dedupedRoots = New-Object System.Collections.Generic.List[string]
    $seenRoots = @{}
    foreach ($root in $roots) {
        $fullRoot = [System.IO.Path]::GetFullPath($root)
        if (-not (Test-Path -LiteralPath $fullRoot -PathType Container)) {
            throw "Codex writable root does not exist: $fullRoot"
        }
        $key = $fullRoot.ToLowerInvariant()
        if (-not $seenRoots.ContainsKey($key)) {
            $seenRoots[$key] = $true
            $dedupedRoots.Add($fullRoot)
        }
    }

    return $dedupedRoots.ToArray()
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
        [string]$LogDirectory,
        [Parameter(Mandatory = $true)]
        [string]$StatusPath,
        [Parameter(Mandatory = $true)]
        [ValidateSet("capture-only", "execution-enabled", "unknown")]
        [string]$BridgeMode,
        [Parameter(Mandatory = $true)]
        [string]$TaskId,
        [Parameter(Mandatory = $true)]
        [string]$TaskStartedAt
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

    try {
        $codexWritableRoots = Resolve-CodexWritableRoots -Config $Config -RepoPath $RepoPath
    }
    catch {
        $failureMessage = $_.Exception.Message
        Write-BridgeLog -LogDirectory $LogDirectory -Message "codex writable root resolution failed error=$failureMessage"
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
        "--sandbox", ([string]$Config.codexSandbox)
    )

    foreach ($root in $codexWritableRoots) {
        $arguments += @("--add-dir", $root)
    }

    $arguments += @(
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
        Write-BridgeDisplayStatus -StatusPath $StatusPath -State "codex-running" -Mode $BridgeMode -TaskId $TaskId -CodexPid $process.Id -TaskStartedAt $TaskStartedAt -OutputPath $ReportPath -LastTaskStatus "codex-running"
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

$appPath = Resolve-BridgePath -BasePath $repoPath -PathValue ([string]$config.appPath)
if (-not (Test-Path -LiteralPath $appPath)) {
    throw "appPath does not exist: $appPath"
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
Write-Host "App: $appPath"
Write-Host "Press Ctrl+C to stop."

$suppressedClipboardHashes = @{}
$executionInProgress = $false
$bridgeMode = if ($config.executionEnabled) { "execution-enabled" } else { "capture-only" }
$idleState = if ($config.executionEnabled) { "execution-idle" } else { "capture-only-idle" }
$lastIgnoredClipboardHash = $null
$lastProcessedClipboardHash = $null
Write-BridgeDisplayStatus -StatusPath $displayStatusPath -State $idleState -Mode $bridgeMode

try {
do {
    $clipboardText = Get-ClipboardTextSafe
    $clipboardHash = if ($null -ne $clipboardText) { Get-Sha256 -Text $clipboardText } else { $null }

    if ($null -ne $clipboardHash -and $suppressedClipboardHashes.ContainsKey($clipboardHash)) {
        if ($lastIgnoredClipboardHash -ne $clipboardHash) {
            Write-BridgeLog -LogDirectory $logsPath -Message "ignored suppressed clipboard content hash=$clipboardHash reason=$($suppressedClipboardHashes[$clipboardHash])"
        }
        $lastIgnoredClipboardHash = $clipboardHash
        $codexBlock = $null
    }
    elseif ($executionInProgress) {
        if ($lastIgnoredClipboardHash -ne $clipboardHash) {
            Write-BridgeLog -LogDirectory $logsPath -Message "ignored clipboard content while codex execution in progress hash=$clipboardHash"
        }
        $lastIgnoredClipboardHash = $clipboardHash
        $codexBlock = $null
    }
    elseif ($null -ne $clipboardText) {
        if ($lastProcessedClipboardHash -ne $clipboardHash -and $lastIgnoredClipboardHash -ne $null) {
            Write-BridgeDisplayStatus -StatusPath $displayStatusPath -State $idleState -Mode $bridgeMode
        }
        $lastIgnoredClipboardHash = $null
        $codexBlock = Get-CodexBlock -Text $clipboardText
    }
    else {
        if ($lastIgnoredClipboardHash -ne $null) {
            Write-BridgeDisplayStatus -StatusPath $displayStatusPath -State $idleState -Mode $bridgeMode
        }
        $lastIgnoredClipboardHash = $null
        $codexBlock = $null
    }
    $lastProcessedClipboardHash = $clipboardHash

    if ($null -ne $codexBlock) {
        $hash = Get-Sha256 -Text $codexBlock
        $seenHashes = Get-SeenHashes -Path $seenHashesPath

        if ($seenHashes.ContainsKey($hash)) {
            if ($lastIgnoredClipboardHash -ne $hash) {
                Write-BridgeLog -LogDirectory $logsPath -Message "duplicate task skipped hash=$hash"
            }
            $lastIgnoredClipboardHash = $hash
        }
        else {
            $archivePath = Get-TimestampedPath -Directory $tasksPath -Suffix "task.md"
            $taskId = Get-CodexTaskId -Text $codexBlock -Hash $hash
            $taskStartedAt = (Get-Date).ToUniversalTime().ToString("o")

            Write-Utf8File -Path $taskOutputPath -Content $codexBlock
            Write-Utf8File -Path $archivePath -Content $codexBlock
            Add-SeenHash -Path $seenHashesPath -Hash $hash
            Write-BridgeLog -LogDirectory $logsPath -Message "task captured hash=$hash output=$taskOutputPath archive=$archivePath"
            Write-BridgeDisplayStatus -StatusPath $displayStatusPath -State "task-captured" -Mode $bridgeMode -TaskId $taskId -TaskStartedAt $taskStartedAt -OutputPath $taskOutputPath -LastTaskStatus "task-detected" -EventTimeField "lastTaskAt"
            Show-BridgeNotification -Config $config -Message "Lighthouse Bridge: task captured"

            if ($config.copyConfirmationToClipboard) {
                Set-BridgeClipboard -SuppressedHashes $suppressedClipboardHashes -Text "Lighthouse Clipboard Bridge: task captured and written to ALICE_TO_CODEX_TASK.md" -Reason "capture-confirmation" -LogDirectory $logsPath
            }

            Write-Host "Task captured: $archivePath"

            if ($config.executionEnabled) {
                $reportPath = Get-TimestampedPath -Directory $reportsPath -Suffix "report.md"
                Show-BridgeNotification -Config $config -Message "Lighthouse Bridge: Codex executing..."
                $executionInProgress = $true
                Write-BridgeDisplayStatus -StatusPath $displayStatusPath -State "codex-running" -Mode $bridgeMode -TaskId $taskId -TaskStartedAt $taskStartedAt -OutputPath $reportPath -LastTaskStatus "codex-starting"
                try {
                    $codexResult = Invoke-CodexCli -Config $config -RepoPath $repoPath -TaskText $codexBlock -ReportPath $reportPath -LogDirectory $logsPath -StatusPath $displayStatusPath -BridgeMode $bridgeMode -TaskId $taskId -TaskStartedAt $taskStartedAt
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
                    Write-BridgeDisplayStatus -StatusPath $displayStatusPath -State "codex-finished" -Mode $bridgeMode -TaskId $taskId -TaskStartedAt $taskStartedAt -OutputPath $reportPath -LastTaskStatus "codex-completed" -EventTimeField "lastReportAt"
                    Write-Host "Codex report written: $reportPath"
                    if ($config.copyReportToClipboard) {
                        Set-BridgeClipboard -SuppressedHashes $suppressedClipboardHashes -Text $codexResult.ReportText -Reason "codex-report" -LogDirectory $logsPath
                    }
                    Show-BridgeNotification -Config $config -Message "Lighthouse Bridge: Codex finished. Report copied to clipboard."
                }
                else {
                    Write-BridgeDisplayStatus -StatusPath $displayStatusPath -State "codex-failed" -Mode $bridgeMode -TaskId $taskId -TaskStartedAt $taskStartedAt -OutputPath $reportPath -LastTaskStatus "codex-failed" -ErrorSummary $codexResult.FailureMessage -EventTimeField "lastErrorAt" -ErrorKind "codex-execution-failed"
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
