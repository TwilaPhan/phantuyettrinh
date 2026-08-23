Add-Type -AssemblyName System.Drawing

$srcPath = "D:\LP-Financial Coach\Branding\Logo.png"
$dstPath = "D:\LP-Financial Coach\Branding\Logo-cropped.png"

$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $bmp.Width
$h = $bmp.Height

$minX = $w
$minY = $h
$maxX = 0
$maxY = 0

$whiteThreshold = 245
$alphaThreshold = 10

for ($y = 0; $y -lt $h; $y++) {
  for ($x = 0; $x -lt $w; $x++) {
    $p = $bmp.GetPixel($x, $y)
    $isBg = ($p.A -lt $alphaThreshold) -or ($p.R -ge $whiteThreshold -and $p.G -ge $whiteThreshold -and $p.B -ge $whiteThreshold)
    if (-not $isBg) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}

Write-Host "Bounding box: x=$minX..$maxX y=$minY..$maxY (image $w x $h)"

$pad = 2
$cx = [Math]::Max(0, $minX - $pad)
$cy = [Math]::Max(0, $minY - $pad)
$cw = [Math]::Min($w - $cx, ($maxX - $minX + 1) + $pad*2)
$ch = [Math]::Min($h - $cy, ($maxY - $minY + 1) + $pad*2)

$rect = New-Object System.Drawing.Rectangle($cx, $cy, $cw, $ch)
$cropped = New-Object System.Drawing.Bitmap($cw, $ch)
$g = [System.Drawing.Graphics]::FromImage($cropped)
$g.DrawImage($bmp, (New-Object System.Drawing.Rectangle(0,0,$cw,$ch)), $rect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

$cropped.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
$cropped.Dispose()
$bmp.Dispose()

Write-Host "Saved cropped image ($cw x $ch) to $dstPath"
