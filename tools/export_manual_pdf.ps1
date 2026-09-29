$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$docx = Join-Path $root 'deliverables\SiraNaBa_User_Manual_Small_Team.docx'
$pdfDir = Join-Path $root 'tools\manual_render_v2'
$pdf = Join-Path $pdfDir 'SiraNaBa_User_Manual_Small_Team.pdf'
New-Item -ItemType Directory -Force -Path $pdfDir | Out-Null
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($docx, $false, $true)
    $doc.SaveAs2($pdf, 17)
    $doc.Close(0)
} finally {
    $word.Quit()
}
Write-Output $pdf
