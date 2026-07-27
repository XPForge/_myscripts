param(
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateSet("start", "stop", "restart", "status", "monitor", "monitor-window")]
    [string]$Command,

    [string]$ConfigPath = "",

    [switch]$CaptureOnly,

    [ValidateRange(1, 60)]
    [int]$MonitorIntervalSeconds = 2,

    [switch]$Once
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\..\.."))
$RuntimePath = Join-Path $RepoRoot ".codex-bridge"
$LogsPath = Join-Path $RuntimePath "logs"
$PidPath = Join-Path $RuntimePath "bridge.pid"
$StatusPath = Join-Path $RuntimePath "bridge-status.json"
$DisplayStatusPath = Join-Path $RuntimePath "status.json"
$WatcherPath = Join-Path $PSScriptRoot "watch-clipboard.ps1"
$StatusLightPath = Join-Path $PSScriptRoot "bridge-status-light.ps1"
$StatusLightPidPath = Join-Path $RuntimePath "bridge-status-light.pid"
$DefaultExecutionConfigPath = Join-Path $PSScriptRoot "config.local.json"
$LaunchVerifyDelayMs = 1500

if (-not ("BridgeNativeProcess" -as [type])) {
    Add-Type @"
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;

public static class BridgeNativeProcess {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct STARTUPINFO {
        public UInt32 cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public UInt32 dwX;
        public UInt32 dwY;
        public UInt32 dwXSize;
        public UInt32 dwYSize;
        public UInt32 dwXCountChars;
        public UInt32 dwYCountChars;
        public UInt32 dwFillAttribute;
        public UInt32 dwFlags;
        public UInt16 wShowWindow;
        public UInt16 cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct PROCESS_INFORMATION {
        public IntPtr hProcess;
        public IntPtr hThread;
        public UInt32 dwProcessId;
        public UInt32 dwThreadId;
    }

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool CreateProcess(
        string lpApplicationName,
        StringBuilder lpCommandLine,
        IntPtr lpProcessAttributes,
        IntPtr lpThreadAttributes,
        bool bInheritHandles,
        UInt32 dwCreationFlags,
        IntPtr lpEnvironment,
        string lpCurrentDirectory,
        ref STARTUPINFO lpStartupInfo,
        out PROCESS_INFORMATION lpProcessInformation);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr hObject);

    public static int Start(string commandLine, string workingDirectory) {
        const UInt32 DETACHED_PROCESS = 0x00000008;
        const UInt32 CREATE_NEW_PROCESS_GROUP = 0x00000200;
        const UInt32 CREATE_BREAKAWAY_FROM_JOB = 0x01000000;

        STARTUPINFO startupInfo = new STARTUPINFO();
        startupInfo.cb = (UInt32)Marshal.SizeOf(typeof(STARTUPINFO));
        PROCESS_INFORMATION processInfo;
        StringBuilder mutableCommandLine = new StringBuilder(commandLine);
        UInt32 flags = DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | CREATE_BREAKAWAY_FROM_JOB;

        bool ok = CreateProcess(null, mutableCommandLine, IntPtr.Zero, IntPtr.Zero, false, flags, IntPtr.Zero, workingDirectory, ref startupInfo, out processInfo);
        if (!ok) {
            throw new Win32Exception(Marshal.GetLastWin32Error());
        }

        CloseHandle(processInfo.hThread);
        CloseHandle(processInfo.hProcess);
        return (int)processInfo.dwProcessId;
    }
}
"@
}

function Initialize-ControlPaths {
    New-Item -ItemType Directory -Force -Path $RuntimePath, $LogsPath | Out-Null
}

function Write-ControlLog {
    param([Parameter(Mandatory = $true)][string]$Message)

    Initialize-ControlPaths
    $date = Get-Date -Format "yyyyMMdd"
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logPath = Join-Path $LogsPath "$date-control.log"
    Add-Content -LiteralPath $logPath -Value "[$timestamp] $Message"
}

function ConvertTo-SafeDisplayTimestamp {
    param($Value)

    if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value)) { return $null }
    try { return ([datetimeoffset]::Parse([string]$Value)).ToUniversalTime().ToString("o") } catch { return $null }
}

function ConvertTo-SafeDisplayErrorKind {
    param($Value)

    $label = [string]$Value
    if ($label -match '^[a-z0-9-]{1,48}$') { return $label }
    return $null
}

function Write-DisplayStoppedStatus {
    param([string]$Reason)

    $existing = $null
    if (Test-Path -LiteralPath $DisplayStatusPath) {
        try { $existing = Get-Content -LiteralPath $DisplayStatusPath -Raw | ConvertFrom-Json } catch { $existing = $null }
    }

    $controlStatus = Read-BridgeStatusFile
    $displayMode = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "mode" -and $existing.mode -in @("capture-only", "execution-enabled", "unknown")) {
        [string]$existing.mode
    }
    elseif ($null -ne $controlStatus -and $controlStatus.PSObject.Properties.Name -contains "executionMode" -and $controlStatus.executionMode -in @("capture-only", "execution-enabled", "unknown")) {
        [string]$controlStatus.executionMode
    }
    else {
        "unknown"
    }

    $status = [ordered]@{
        schemaVersion = 1
        state = "stopped"
        mode = $displayMode
        updatedAt = (Get-Date).ToUniversalTime().ToString("o")
        lastTaskAt = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "lastTaskAt") { ConvertTo-SafeDisplayTimestamp $existing.lastTaskAt } else { $null }
        lastReportAt = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "lastReportAt") { ConvertTo-SafeDisplayTimestamp $existing.lastReportAt } else { $null }
        lastErrorAt = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "lastErrorAt") { ConvertTo-SafeDisplayTimestamp $existing.lastErrorAt } else { $null }
        lastErrorKind = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "lastErrorKind") { ConvertTo-SafeDisplayErrorKind $existing.lastErrorKind } else { $null }
    }
    $temporaryPath = "$DisplayStatusPath.tmp"
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($temporaryPath, ($status | ConvertTo-Json), $encoding)
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        try {
            Move-Item -LiteralPath $temporaryPath -Destination $DisplayStatusPath -Force
            return
        }
        catch {
            if ($attempt -eq 5) { throw }
            Start-Sleep -Milliseconds 50
        }
    }
}

function Read-BridgePid {
    if (-not (Test-Path -LiteralPath $PidPath)) {
        return $null
    }

    $rawPid = (Get-Content -LiteralPath $PidPath -Raw).Trim()
    if ($rawPid -notmatch '^\d+$') {
        return $null
    }

    return [int]$rawPid
}

function Get-BridgeProcess {
    param([Parameter(Mandatory = $true)][int]$ProcessIdValue)

    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessIdValue" -ErrorAction SilentlyContinue
    if ($null -eq $process) {
        $fallbackProcess = Get-Process -Id $ProcessIdValue -ErrorAction SilentlyContinue
        if ($null -ne $fallbackProcess -and $fallbackProcess.ProcessName -in @("powershell", "pwsh")) {
            return $fallbackProcess
        }
        return $null
    }

    $normalizedWatcherPath = $WatcherPath.ToLowerInvariant()
    $commandLine = if ($process.CommandLine) { $process.CommandLine.ToLowerInvariant() } else { "" }

    if ($commandLine.Contains($normalizedWatcherPath)) {
        return $process
    }

    return $null
}

function Read-StatusLightPid {
    if (-not (Test-Path -LiteralPath $StatusLightPidPath)) {
        return $null
    }

    $rawPid = (Get-Content -LiteralPath $StatusLightPidPath -Raw).Trim()
    if ($rawPid -notmatch '^\d+$') {
        return $null
    }

    return [int]$rawPid
}

function Get-StatusLightProcess {
    param([Parameter(Mandatory = $true)][int]$ProcessIdValue)

    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessIdValue" -ErrorAction SilentlyContinue
    if ($null -eq $process) {
        $fallbackProcess = Get-Process -Id $ProcessIdValue -ErrorAction SilentlyContinue
        if ($null -ne $fallbackProcess -and $fallbackProcess.ProcessName -in @("powershell", "pwsh")) {
            return $fallbackProcess
        }
        return $null
    }

    $normalizedStatusLightPath = $StatusLightPath.ToLowerInvariant()
    $commandLine = if ($process.CommandLine) { $process.CommandLine.ToLowerInvariant() } else { "" }

    if ($commandLine.Contains($normalizedStatusLightPath)) {
        return $process
    }

    return $null
}

function Get-StatusLightStatus {
    $pidValue = Read-StatusLightPid
    if ($null -eq $pidValue) {
        return [pscustomobject]@{
            PidFileExists = (Test-Path -LiteralPath $StatusLightPidPath)
            Pid = $null
            IsRunning = $false
            Process = $null
        }
    }

    $process = Get-StatusLightProcess -ProcessIdValue $pidValue
    return [pscustomobject]@{
        PidFileExists = $true
        Pid = $pidValue
        IsRunning = ($null -ne $process)
        Process = $process
    }
}

function Get-BridgeStatus {
    $pidValue = Read-BridgePid
    if ($null -eq $pidValue) {
        return [pscustomobject]@{
            PidFileExists = (Test-Path -LiteralPath $PidPath)
            Pid = $null
            IsRunning = $false
            Process = $null
        }
    }

    $process = Get-BridgeProcess -ProcessIdValue $pidValue
    return [pscustomobject]@{
        PidFileExists = $true
        Pid = $pidValue
        IsRunning = ($null -ne $process)
        Process = $process
    }
}

function Start-StatusLight {
    param([AllowEmptyString()][string]$ResolvedConfigPath)

    Initialize-ControlPaths

    $status = Get-StatusLightStatus
    if ($status.IsRunning) {
        Write-ControlLog "status-light start skipped already-running pid=$($status.Pid)"
        return
    }

    if ($status.PidFileExists) {
        Remove-Item -LiteralPath $StatusLightPidPath -Force -ErrorAction SilentlyContinue
        Write-ControlLog "status-light stale pid cleared pid=$($status.Pid)"
    }

    $resolvedDisplayStatusPath = Resolve-DisplayStatusPath -ResolvedConfigPath $ResolvedConfigPath

    $launchErrorPath = Join-Path $LogsPath "status-light-error.log"
    $arguments = @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-STA",
        "-File", $StatusLightPath,
        "-StatusPath", $resolvedDisplayStatusPath,
        "-LogPath", $launchErrorPath,
        "-PidPath", $StatusLightPidPath
    )
    if ($ResolvedConfigPath) {
        $arguments += @("-ControlConfigPath", $ResolvedConfigPath)
    }

    $launchScriptPath = Join-Path $RuntimePath "start-status-light.ps1"
    $statusLightLaunchArguments = @(
        "-StatusPath '$($resolvedDisplayStatusPath.Replace("'", "''"))'",
        "-LogPath '$($launchErrorPath.Replace("'", "''"))'",
        "-PidPath '$($StatusLightPidPath.Replace("'", "''"))'"
    )
    if ($ResolvedConfigPath) {
        $statusLightLaunchArguments += "-ControlConfigPath '$($ResolvedConfigPath.Replace("'", "''"))'"
    }
    $launchLines = @(
        '$ErrorActionPreference = "Stop"',
        "Set-Location -LiteralPath '$($RepoRoot.Replace("'", "''"))'",
        'try {',
        "    & '$($StatusLightPath.Replace("'", "''"))' $($statusLightLaunchArguments -join ' ')",
        '}',
        'catch {',
        "    Add-Content -LiteralPath '$($launchErrorPath.Replace("'", "''"))' -Value (`"[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] `$(`$_.Exception.ToString())`")",
        '    throw',
        '}'
    )
    Set-Content -LiteralPath $launchScriptPath -Value $launchLines

    $taskName = "LighthouseBridgeStatusLight"
    $powerShellExePath = Join-Path $PSHOME "powershell.exe"
    $taskArguments = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-STA", "-File", $launchScriptPath)
    $taskCommand = (Quote-Argument -Value $powerShellExePath) + " " + (($taskArguments | ForEach-Object { Quote-Argument -Value ([string]$_) }) -join " ")
    $taskCreated = $false
    $launchedBy = ""

    try {
        $nativePid = [BridgeNativeProcess]::Start($taskCommand, $RepoRoot)
        $launchedBy = "native-breakaway"
        Write-ControlLog "status-light native launch attempted pid=$nativePid statusPath=$resolvedDisplayStatusPath"
    }
    catch {
        Write-ControlLog "status-light native launch failed error=$($_.Exception.Message)"
    }

    $scheduleTime = (Get-Date).AddMinutes(1).ToString("HH:mm")
    $createArgs = @("/Create", "/TN", $taskName, "/SC", "ONCE", "/ST", $scheduleTime, "/TR", $taskCommand, "/F", "/RL", "LIMITED", "/IT")
    if (-not $launchedBy) {
        $createResult = Invoke-NativeCommand -FilePath "schtasks.exe" -ArgumentList $createArgs
        if ($createResult.ExitCode -ne 0) {
            Write-ControlLog "status-light scheduled-task interactive create failed exit=$($createResult.ExitCode) output=$($createResult.Output)"
            $createArgs = @("/Create", "/TN", $taskName, "/SC", "ONCE", "/ST", $scheduleTime, "/TR", $taskCommand, "/F", "/RL", "LIMITED")
            $createResult = Invoke-NativeCommand -FilePath "schtasks.exe" -ArgumentList $createArgs
            if ($createResult.ExitCode -ne 0) {
                Write-ControlLog "status-light scheduled-task create failed exit=$($createResult.ExitCode) output=$($createResult.Output)"
            }
            else {
                $taskCreated = $true
            }
        }
        else {
            $taskCreated = $true
        }
    }

    if ($taskCreated) {
        $runResult = Invoke-NativeCommand -FilePath "schtasks.exe" -ArgumentList @("/Run", "/TN", $taskName)
        if ($runResult.ExitCode -eq 0) {
            $launchedBy = "scheduled-task"
        }
        else {
            Write-ControlLog "status-light scheduled-task run failed exit=$($runResult.ExitCode) output=$($runResult.Output)"
        }
    }

    if (-not $launchedBy) {
        try {
            $shortcutPath = Join-Path $RuntimePath "LighthouseBridgeStatusLight.lnk"
            $shortcutArguments = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-STA", "-File", $launchScriptPath)
            $shortcutShell = New-Object -ComObject WScript.Shell
            $shortcut = $shortcutShell.CreateShortcut($shortcutPath)
            $shortcut.TargetPath = $powerShellExePath
            $shortcut.Arguments = (($shortcutArguments | ForEach-Object { Quote-Argument -Value ([string]$_) }) -join " ")
            $shortcut.WorkingDirectory = $RepoRoot
            $shortcut.WindowStyle = 7
            $shortcut.Description = "Lighthouse Bridge Status Light"
            $shortcut.Save()
            $cmdStartArguments = "/c start """" $(Quote-Argument -Value $shortcutPath)"
            Start-Process -FilePath "cmd.exe" -ArgumentList $cmdStartArguments -WindowStyle Hidden
            $launchedBy = "shortcut-start"
            Write-ControlLog "status-light shortcut start launch attempted statusPath=$resolvedDisplayStatusPath"
        }
        catch {
            Write-ControlLog "status-light shortcut start launch failed error=$($_.Exception.Message)"
            return
        }
    }

    $startedPid = $null
    $verifiedProcess = $null
    for ($attempt = 1; $attempt -le 20; $attempt++) {
        Start-Sleep -Milliseconds 500
        $startedPid = Read-StatusLightPid
        if ($null -ne $startedPid) {
            $verifiedProcess = Get-StatusLightProcess -ProcessIdValue $startedPid
            if ($null -ne $verifiedProcess) {
                break
            }
        }
    }

    if ($taskCreated) {
        [void](Invoke-NativeCommand -FilePath "schtasks.exe" -ArgumentList @("/Delete", "/TN", $taskName, "/F"))
    }

    if ($null -eq $startedPid -or $null -eq $verifiedProcess) {
        Remove-Item -LiteralPath $StatusLightPidPath -Force -ErrorAction SilentlyContinue
        Write-ControlLog "status-light start failed launchMethod=$launchedBy pid=$startedPid aliveAfterLaunch=false statusPath=$resolvedDisplayStatusPath"
        return
    }

    Write-ControlLog "status-light start verified launchMethod=$launchedBy pid=$startedPid aliveAfterLaunch=true statusPath=$resolvedDisplayStatusPath"
}

function Stop-StatusLight {
    Initialize-ControlPaths

    $status = Get-StatusLightStatus
    if (-not $status.IsRunning) {
        if ($status.PidFileExists) {
            Remove-Item -LiteralPath $StatusLightPidPath -Force -ErrorAction SilentlyContinue
            Write-ControlLog "status-light stale pid cleared pid=$($status.Pid)"
        }
        return
    }

    Stop-Process -Id $status.Pid -Force
    Start-Sleep -Milliseconds 250
    Remove-Item -LiteralPath $StatusLightPidPath -Force -ErrorAction SilentlyContinue
    Write-ControlLog "status-light stopped pid=$($status.Pid)"
}

function Clear-StaleBridgeState {
    param([string]$Reason)

    $hadPid = Test-Path -LiteralPath $PidPath
    if ($hadPid) {
        Remove-Item -LiteralPath $PidPath -Force
    }

    Update-BridgeStoppedStatus -Reason $Reason
    Write-ControlLog "stale state cleaned reason=$Reason hadPidFile=$hadPid"
}

function Resolve-ConfigPath {
    param([string]$Path)

    if (-not $Path) {
        return ""
    }

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }

    return [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $Path))
}

function Resolve-DisplayStatusPath {
    param([AllowEmptyString()][string]$ResolvedConfigPath)

    $displayRepoPath = $RepoRoot
    if ($ResolvedConfigPath -and (Test-Path -LiteralPath $ResolvedConfigPath)) {
        try {
            $rawConfig = Get-Content -LiteralPath $ResolvedConfigPath -Raw | ConvertFrom-Json
            if ($rawConfig.PSObject.Properties.Name -contains "repoPath" -and -not [string]::IsNullOrWhiteSpace([string]$rawConfig.repoPath)) {
                if ([System.IO.Path]::IsPathRooted([string]$rawConfig.repoPath)) {
                    $displayRepoPath = [System.IO.Path]::GetFullPath([string]$rawConfig.repoPath)
                }
                else {
                    $displayRepoPath = [System.IO.Path]::GetFullPath((Join-Path $RepoRoot ([string]$rawConfig.repoPath)))
                }
            }
        }
        catch {
            Write-ControlLog "status-light display status path fallback reason=config-read-failed"
        }
    }

    return [System.IO.Path]::GetFullPath((Join-Path $displayRepoPath ".codex-bridge\status.json"))
}

function Resolve-StartConfigPath {
    if ($CaptureOnly) {
        return Resolve-ConfigPath -Path $ConfigPath
    }

    if ($ConfigPath) {
        return Resolve-ConfigPath -Path $ConfigPath
    }

    return [System.IO.Path]::GetFullPath($DefaultExecutionConfigPath)
}

function Get-ExecutionMode {
    param([string]$ResolvedConfigPath)

    if (-not $ResolvedConfigPath) {
        if ($CaptureOnly) {
            return "capture-only"
        }
        return "execution-enabled"
    }

    if (-not (Test-Path -LiteralPath $ResolvedConfigPath)) {
        return "unknown"
    }

    try {
        $rawConfig = Get-Content -LiteralPath $ResolvedConfigPath -Raw | ConvertFrom-Json
        if ($rawConfig.PSObject.Properties.Name -contains "executionEnabled") {
            if ($rawConfig.executionEnabled) {
                return "execution-enabled"
            }
            return "capture-only"
        }
        if ($CaptureOnly) {
            return "capture-only"
        }
        return "execution-enabled"
    }
    catch {
        return "unknown"
    }
}

function Read-BridgeStatusFile {
    if (-not (Test-Path -LiteralPath $StatusPath)) {
        return $null
    }

    try {
        return Get-Content -LiteralPath $StatusPath -Raw | ConvertFrom-Json
    }
    catch {
        return $null
    }
}

function Read-DisplayStatusFile {
    if (-not (Test-Path -LiteralPath $DisplayStatusPath)) {
        return $null
    }

    try {
        return Get-Content -LiteralPath $DisplayStatusPath -Raw | ConvertFrom-Json
    }
    catch {
        return $null
    }
}

function Get-DisplayStatusValue {
    param(
        $DisplayStatus,
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [string]$Default = "-"
    )

    if ($null -ne $DisplayStatus -and $DisplayStatus.PSObject.Properties.Name -contains $Name -and $null -ne $DisplayStatus.$Name -and -not [string]::IsNullOrWhiteSpace([string]$DisplayStatus.$Name)) {
        return [string]$DisplayStatus.$Name
    }

    return $Default
}

function Write-BridgeStatusFile {
    param(
        [Parameter(Mandatory = $true)]
        [int]$ProcessIdValue,
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$ResolvedConfigPath,
        [Parameter(Mandatory = $true)]
        [string]$ExecutionMode
    )

    $status = [ordered]@{
        pid = $ProcessIdValue
        startedAt = (Get-Date).ToString("o")
        configPath = $ResolvedConfigPath
        executionEnabled = ($ExecutionMode -eq "execution-enabled")
        executionMode = $ExecutionMode
    }

    $status | ConvertTo-Json | Set-Content -LiteralPath $StatusPath
}

function Update-BridgeStoppedStatus {
    param([string]$Reason)

    $existing = Read-BridgeStatusFile
    $status = [ordered]@{
        pid = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "pid") { $existing.pid } else { $null }
        startedAt = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "startedAt") { $existing.startedAt } else { $null }
        stoppedAt = (Get-Date).ToString("o")
        configPath = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "configPath") { $existing.configPath } else { "" }
        executionEnabled = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "executionEnabled") { $existing.executionEnabled } else { $null }
        executionMode = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "executionMode") { $existing.executionMode } else { "unknown" }
        state = "stopped"
        reason = $Reason
    }

    $status | ConvertTo-Json | Set-Content -LiteralPath $StatusPath
    Write-DisplayStoppedStatus -Reason $Reason
}

function Quote-Argument {
    param([Parameter(Mandatory = $true)][string]$Value)

    if ($Value -notmatch '[\s"]') {
        return $Value
    }

    return '"' + ($Value -replace '"', '\"') + '"'
}

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$ArgumentList
    )

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = & $FilePath @ArgumentList 2>&1
        return [pscustomobject]@{
            ExitCode = $LASTEXITCODE
            Output = ($output -join " ")
        }
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
}

function Start-Bridge {
    Initialize-ControlPaths

    $status = Get-BridgeStatus
    if ($status.IsRunning) {
        $statusFile = Read-BridgeStatusFile
        $runningMode = if ($null -ne $statusFile -and $statusFile.PSObject.Properties.Name -contains "executionMode") { [string]$statusFile.executionMode } else { "unknown" }
        Write-Host "Lighthouse Clipboard Bridge already running in $runningMode mode (PID $($status.Pid))"
        Write-ControlLog "start skipped already-running pid=$($status.Pid) mode=$runningMode"
        return
    }

    if ($status.PidFileExists) {
        Clear-StaleBridgeState -Reason "stale-before-start"
    }

    $arguments = @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-STA",
        "-File", $WatcherPath
    )

    $resolvedConfigPath = Resolve-StartConfigPath
    $executionMode = Get-ExecutionMode -ResolvedConfigPath $resolvedConfigPath

    if ($resolvedConfigPath) {
        if (-not (Test-Path -LiteralPath $resolvedConfigPath)) {
            Write-Host "Lighthouse Clipboard Bridge failed to start: config file not found."
            Write-Host "Config path: $resolvedConfigPath"
            Write-Host "Create it from tools\\clipboard-bridge\\config.local.example.json for execution-enabled shortcuts."
            Write-ControlLog "start failed missing-config configProvided=true"
            exit 1
        }
        $arguments += @("-ConfigPath", $resolvedConfigPath)
    }

    if ($CaptureOnly) {
        $arguments += "-CaptureOnly"
    }
    elseif ($executionMode -ne "execution-enabled") {
        Write-Host "Lighthouse Clipboard Bridge failed to start: normal starts require execution-enabled mode."
        Write-Host "Set executionEnabled to true in config.local.json, or use -CaptureOnly only for explicit developer testing."
        Write-ControlLog "start failed capture-only-config-without-dev-flag mode=$executionMode"
        exit 1
    }

    $argumentLine = ($arguments | ForEach-Object { Quote-Argument -Value ([string]$_) }) -join " "
    Write-ControlLog "start attempted mode=$executionMode configProvided=$([bool]$resolvedConfigPath)"
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = "powershell.exe"
    $processInfo.Arguments = $argumentLine
    $processInfo.WorkingDirectory = $RepoRoot
    $processInfo.UseShellExecute = $false
    $processInfo.CreateNoWindow = $true
    $process = [System.Diagnostics.Process]::Start($processInfo)
    Write-ControlLog "start launched pid=$($process.Id)"

    Start-Sleep -Milliseconds $LaunchVerifyDelayMs
    $verifiedProcess = Get-BridgeProcess -ProcessIdValue $process.Id
    if ($null -eq $verifiedProcess) {
        Write-Host "Lighthouse Clipboard Bridge failed to start: watcher process exited or was not verified."
        Write-ControlLog "start failed pid=$($process.Id) aliveAfterLaunch=false"
        Update-BridgeStoppedStatus -Reason "start-failed"
        exit 1
    }

    Set-Content -LiteralPath $PidPath -Value ([string]$process.Id)
    Write-BridgeStatusFile -ProcessIdValue $process.Id -ResolvedConfigPath $resolvedConfigPath -ExecutionMode $executionMode
    Write-ControlLog "start verified pid=$($process.Id) aliveAfterLaunch=true mode=$executionMode"
    Write-Host "Lighthouse Clipboard Bridge started in $executionMode mode (PID $($process.Id))"
}

function Stop-Bridge {
    Initialize-ControlPaths

    $status = Get-BridgeStatus
    if (-not $status.IsRunning) {
        if ($status.PidFileExists) {
            Clear-StaleBridgeState -Reason "stale-during-stop"
        }
        Stop-StatusLight
        Write-Host "Lighthouse Clipboard Bridge is not running"
        Update-BridgeStoppedStatus -Reason "already-stopped"
        Write-ControlLog "stop skipped not-running"
        return
    }

    Stop-Process -Id $status.Pid -Force
    Start-Sleep -Milliseconds 750
    $stillRunning = Get-BridgeProcess -ProcessIdValue $status.Pid
    if ($null -ne $stillRunning) {
        Write-Host "Lighthouse Clipboard Bridge stop failed: watcher still running (PID $($status.Pid))"
        Write-ControlLog "stop failed pid=$($status.Pid) stillRunning=true"
        exit 1
    }

    Remove-Item -LiteralPath $PidPath -Force -ErrorAction SilentlyContinue
    Update-BridgeStoppedStatus -Reason "stopped-by-control"
    Stop-StatusLight

    Write-Host "Lighthouse Clipboard Bridge stopped"
    Write-ControlLog "stopped pid=$($status.Pid)"
}

function Show-BridgeStatus {
    Initialize-ControlPaths

    $status = Get-BridgeStatus
    $statusFile = Read-BridgeStatusFile
    $displayStatus = Read-DisplayStatusFile
    $statusConfigPath = if ($null -ne $statusFile -and $statusFile.PSObject.Properties.Name -contains "configPath") { [string]$statusFile.configPath } else { "" }
    $statusMode = if ($null -ne $displayStatus -and $displayStatus.PSObject.Properties.Name -contains "executionMode") {
        [string]$displayStatus.executionMode
    }
    elseif ($null -ne $displayStatus -and $displayStatus.PSObject.Properties.Name -contains "mode") {
        [string]$displayStatus.mode
    }
    elseif ($null -ne $statusFile -and $statusFile.PSObject.Properties.Name -contains "executionMode") {
        [string]$statusFile.executionMode
    }
    else {
        "unknown"
    }
    $resolvedStatusPath = Resolve-DisplayStatusPath -ResolvedConfigPath $statusConfigPath

    if ($status.IsRunning) {
        Write-Host "Lighthouse Clipboard Bridge running"
        Write-Host "Bridge running: yes"
        Write-Host "PID: $($status.Pid)"
        Write-Host "PID file exists: $($status.PidFileExists)"
        Write-Host "Config path: $(if ($statusConfigPath) { $statusConfigPath } else { '(default)' })"
        Write-Host "Execution mode: $statusMode"
        Write-Host "Status source path: $resolvedStatusPath"
        Write-Host "Status source: $(Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'source' -Default 'watcher/root-status')"
        Write-Host "State: $(Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'state')"
        Write-Host "currentTaskId: $(Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'currentTaskId')"
        Write-Host "currentCodexPid: $(Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'currentCodexPid')"
        Write-Host "lastTaskId: $(Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'lastTaskId')"
        Write-Host "lastTaskStatus: $(Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'lastTaskStatus')"
        Write-Host "lastTaskStartedAt: $(Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'lastTaskStartedAt' -Default (Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'lastTaskAt'))"
        Write-Host "lastTaskCompletedAt: $(Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'lastTaskCompletedAt' -Default (Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'lastReportAt'))"
        Write-Host "lastOutputPath: $(Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'lastOutputPath')"
        Write-Host "lastErrorSummary: $(Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'lastErrorSummary' -Default (Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'lastErrorKind'))"
        Write-Host "Status light required for bridge visibility: no"
        Write-ControlLog "status running pid=$($status.Pid) mode=$statusMode pidFileExists=$($status.PidFileExists)"
        return
    }

    Write-Host "Lighthouse Clipboard Bridge not running"
    Write-Host "Bridge running: no"
    if ($null -ne $status.Pid) {
        Write-Host "PID file exists: $($status.PidFileExists)"
        Write-Host "Stale PID: $($status.Pid)"
        Clear-StaleBridgeState -Reason "stale-during-status"
    }
    else {
        Write-Host "PID file exists: $($status.PidFileExists)"
    }
    Write-Host "Config path: $(if ($statusConfigPath) { $statusConfigPath } else { '(unknown)' })"
    Write-Host "Execution mode: $statusMode"
    Write-Host "Status source path: $resolvedStatusPath"
    Write-Host "Status source: $(Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'source' -Default 'watcher/root-status')"
    Write-Host "State: $(Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'state')"
    Write-Host "currentTaskId: $(Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'currentTaskId')"
    Write-Host "currentCodexPid: $(Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'currentCodexPid')"
    Write-Host "lastTaskId: $(Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'lastTaskId')"
    Write-Host "lastTaskStatus: $(Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'lastTaskStatus')"
    Write-Host "lastTaskStartedAt: $(Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'lastTaskStartedAt' -Default (Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'lastTaskAt'))"
    Write-Host "lastTaskCompletedAt: $(Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'lastTaskCompletedAt' -Default (Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'lastReportAt'))"
    Write-Host "lastOutputPath: $(Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'lastOutputPath')"
    Write-Host "lastErrorSummary: $(Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'lastErrorSummary' -Default (Get-DisplayStatusValue -DisplayStatus $displayStatus -Name 'lastErrorKind'))"
    Write-Host "Status light required for bridge visibility: no"
    Write-ControlLog "status not-running mode=$statusMode pidFileExists=$($status.PidFileExists)"
}

function Start-BridgeMonitor {
    Initialize-ControlPaths

    do {
        Clear-Host
        Write-Host "Lighthouse Bridge Monitor"
        Write-Host "Updated: $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))"
        Write-Host ""
        Show-BridgeStatus

        if ($Once) {
            break
        }

        Start-Sleep -Seconds $MonitorIntervalSeconds
    } while ($true)
}

function Start-BridgeMonitorWindow {
    Initialize-ControlPaths

    $powerShellExePath = Join-Path $PSHOME "powershell.exe"
    $monitorCommand = "`$Host.UI.RawUI.WindowTitle = 'Lighthouse Bridge Monitor'; & '$($PSCommandPath.Replace("'", "''"))' monitor -MonitorIntervalSeconds $MonitorIntervalSeconds"
    $monitorArguments = @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-NoExit",
        "-Command",
        $monitorCommand
    )

    Start-Process -FilePath $powerShellExePath -ArgumentList $monitorArguments -WorkingDirectory $RepoRoot
    Write-Host "Lighthouse Bridge Monitor window opened"
}

switch ($Command) {
    "start" {
        Start-Bridge
    }
    "stop" {
        Stop-Bridge
    }
    "restart" {
        Stop-Bridge
        Start-Bridge
    }
    "status" {
        Show-BridgeStatus
    }
    "monitor" {
        Start-BridgeMonitor
    }
    "monitor-window" {
        Start-BridgeMonitorWindow
    }
}
