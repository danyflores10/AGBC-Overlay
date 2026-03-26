param(
    [Parameter(Mandatory=$true)][string]$InputPath,
    [Parameter(Mandatory=$true)][string]$OutputDir
)

$ErrorActionPreference = 'Stop'

if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$ppt = $null
$pres = $null

try {
    $ppt = New-Object -ComObject PowerPoint.Application
    # Open: ReadOnly=True, Untitled=False, WithWindow=False
    $pres = $ppt.Presentations.Open($InputPath, -1, 0, 0)
    # 18 = ppSaveAsPNG
    $pres.SaveAs($OutputDir, 18)
    $pres.Close()
    $pres = $null
} catch {
    Write-Error $_.Exception.Message
    exit 1
} finally {
    if ($pres) { try { $pres.Close() } catch {} }
    if ($ppt) {
        $ppt.Quit()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
    }
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}

# List generated PNG files
Get-ChildItem -Path $OutputDir -Filter "*.PNG" -Recurse | Sort-Object Name | ForEach-Object { Write-Output $_.FullName }

exit 0
