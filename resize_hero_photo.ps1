Add-Type -AssemblyName System.Drawing

$srcPath = "D:\LP-Financial Coach\Expert\TCM_88.jpg"
$dstPath = "D:\LP-Financial Coach\Expert\TCM_88-web.jpg"

$src = [System.Drawing.Image]::FromFile($srcPath)
$targetW = 900
$targetH = [int]($src.Height * ($targetW / $src.Width))

$bmp = New-Object System.Drawing.Bitmap($targetW, $targetH)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.DrawImage($src, 0, 0, $targetW, $targetH)
$g.Dispose()
$src.Dispose()

$jpgCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]82)
$bmp.Save($dstPath, $jpgCodec, $encParams)
$bmp.Dispose()

$size = (Get-Item $dstPath).Length
Write-Host "Saved $dstPath ($targetW x $targetH), size: $([math]::Round($size/1KB,1)) KB"
