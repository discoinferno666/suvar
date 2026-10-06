Add-Type -AssemblyName System.Drawing
$taskImage = [System.Drawing.Bitmap]::new((Join-Path (Get-Location) '.qa\figma-desktop.png'))
$taskCrop = $taskImage.Clone([System.Drawing.Rectangle]::new(0,0,1440,1600), $taskImage.PixelFormat)
$taskCrop.Save((Join-Path (Get-Location) '.qa\figma-hero.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$taskCrop.Dispose()
$taskImage.Dispose()
