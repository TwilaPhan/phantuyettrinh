$html = Get-Content "d:\LP-Financial Coach\template.html" -Raw
$html | Out-File -FilePath "d:\LP-Financial Coach\index.html" -Encoding UTF8
Write-Host "Done. Size: $((Get-Item 'd:\LP-Financial Coach\index.html').Length)"
