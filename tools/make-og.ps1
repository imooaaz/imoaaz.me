# Generates assets/img/og.png (1200x630) — social share card.
Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap(1200, 630)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.Clear([System.Drawing.Color]::FromArgb(255, 12, 14, 13))

function Draw([string]$text, [float]$size, [string]$style, [int]$r, [int]$gg, [int]$b, [int]$x, [int]$y) {
  $f = New-Object System.Drawing.Font('Consolas', $size, [System.Drawing.FontStyle]::$style, [System.Drawing.GraphicsUnit]::Pixel)
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, $r, $gg, $b))
  $g.DrawString($text, $f, $brush, $x, $y)
  $f.Dispose(); $brush.Dispose()
}

# amber left rule
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 217, 165, 74), 4)
$g.DrawLine($pen, 0, 0, 0, 630)
$pen.Dispose()

Draw '$ whoami' 30 'Regular' 124 136 128 84 118
Draw 'Moaaz Afifi' 96 'Bold' 238 243 238 76 168
Draw 'cybersecurity engineer & penetration tester' 34 'Regular' 198 208 200 84 322
Draw 'CVE-2024-36436  /  eCPPT  /  eWPTX  /  eMAPT' 28 'Bold' 217 165 74 84 392
Draw 'web + mobile pentest / appsec / devsecops / bug bounty' 24 'Regular' 124 136 128 84 452
Draw 'imoaz.me' 26 'Regular' 124 136 128 84 546

$bmp.Save("$PSScriptRoot\..\assets\img\og.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output 'og.png written'
