import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// --------------------------------------------------------------------------
// MASTER ICON SVG (1024x1024) - Auto Parts Marketplace
// Concept: Zenith Apex Precision Shield
// Colors: Deep Navy Blue (#0B192C), Royal Blue (#2563EB), Pure White (#FFFFFF), Metallic Silver (#CBD5E1)
// Rules: Flat solid vector style, NO text, NO letters, NO gears, NO roads.
// --------------------------------------------------------------------------
const fullIconSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Dynamic Tri-Chevron Delta Node -->
  <!-- Top Spark Diamond - Metallic Silver -->
  <path d="M 512 172 L 548 212 L 512 252 L 476 212 Z" fill="#CBD5E1"/>

  <!-- Primary Outer Chevron - Royal Blue -->
  <path d="M 512 222 L 812 562 L 712 562 L 512 332 L 312 562 L 212 562 Z" fill="#2563EB"/>

  <!-- Secondary Mid Chevron - Royal Blue Dark -->
  <path d="M 512 372 L 732 632 L 642 632 L 512 462 L 382 632 L 292 632 Z" fill="#1D4ED8"/>

  <!-- Core Apex Chevron - Pure White -->
  <path d="M 512 502 L 652 682 L 572 682 L 512 592 L 452 682 L 372 682 Z" fill="#FFFFFF"/>

  <!-- Bottom Anchor Node - Metallic Silver -->
  <circle cx="512" cy="742" r="28" fill="#CBD5E1"/>
</svg>
`;

// --------------------------------------------------------------------------
// ADAPTIVE FOREGROUND ICON SVG (432x432 Viewport)
// Scaled inside 66% Android Safe Zone
// --------------------------------------------------------------------------
const foregroundIconSvg = `
<svg width="432" height="432" viewBox="0 0 432 432" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(216, 216) scale(0.42)">
    <!-- Top Spark Diamond - Metallic Silver -->
    <path d="M 0 -340 L 36 -300 L 0 -260 L -36 -300 Z" fill="#CBD5E1"/>

    <!-- Primary Outer Chevron - Royal Blue -->
    <path d="M 0 -290 L 300 50 L 200 50 L 0 -180 L -200 50 L -300 50 Z" fill="#2563EB"/>

    <!-- Secondary Mid Chevron - Royal Blue Dark -->
    <path d="M 0 -140 L 220 120 L 130 120 L 0 -50 L -130 120 L -220 120 Z" fill="#1D4ED8"/>

    <!-- Core Apex Chevron - Pure White -->
    <path d="M 0 -10 L 140 170 L 60 170 L 0 80 L -60 170 L -140 170 Z" fill="#FFFFFF"/>

    <!-- Bottom Anchor Node - Metallic Silver -->
    <circle cx="0" cy="230" r="28" fill="#CBD5E1"/>
  </g>
</svg>
`;

// --------------------------------------------------------------------------
// MONOCHROME ICON SVG (Android 13+ Themed Icons)
// --------------------------------------------------------------------------
const monochromeIconSvg = `
<svg width="432" height="432" viewBox="0 0 432 432" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(216, 216) scale(0.42)">
    <path d="M 0 -340 L 36 -300 L 0 -260 L -36 -300 Z" fill="#FFFFFF"/>
    <path d="M 0 -290 L 300 50 L 200 50 L 0 -180 L -200 50 L -300 50 Z" fill="#FFFFFF"/>
    <path d="M 0 -140 L 220 120 L 130 120 L 0 -50 L -130 120 L -220 120 Z" fill="#FFFFFF"/>
    <path d="M 0 -10 L 140 170 L 60 170 L 0 80 L -60 170 L -140 170 Z" fill="#FFFFFF"/>
    <circle cx="0" cy="230" r="28" fill="#FFFFFF"/>
  </g>
</svg>
`;

async function main() {
  console.log("🎨 Building Auto Parts India brand icons...");

  // 1. Generate Master 1024x1024 PNG image
  const fullBuffer = await sharp(Buffer.from(fullIconSvg))
    .resize(1024, 1024)
    .png()
    .toBuffer();

  // 2. Play Store 512x512 PNG
  const playStoreBuffer = await sharp(fullBuffer)
    .resize(512, 512)
    .png()
    .toBuffer();

  // 3. Round 1024x1024 PNG (Circle masked)
  const roundMaskSvg = `
    <svg width="1024" height="1024">
      <circle cx="512" cy="512" r="512" fill="#fff"/>
    </svg>
  `;
  const roundBuffer = await sharp(fullBuffer)
    .composite([{ input: Buffer.from(roundMaskSvg), blend: 'dest-in' }])
    .png()
    .toBuffer();

  // 4. Save Web & Applet master images & SVGs
  const webDirs = ['./public', './dist', './src/assets', './react-native-app/src/assets'];
  for (const dir of webDirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'icon.png'), fullBuffer);
    fs.writeFileSync(path.join(dir, 'app-icon.png'), fullBuffer);
    fs.writeFileSync(path.join(dir, 'playstore-icon-512.png'), playStoreBuffer);
    fs.writeFileSync(path.join(dir, 'logo.png'), fullBuffer);
    fs.writeFileSync(path.join(dir, 'app-icon.svg'), fullIconSvg);
    fs.writeFileSync(path.join(dir, 'icon.svg'), fullIconSvg);

    // Favicon generation (32x32 PNG)
    await sharp(fullBuffer)
      .resize(32, 32)
      .png()
      .toFile(path.join(dir, 'favicon.png'));

    console.log(`Saved master PNG, SVG & favicon assets to ${dir}`);
  }

  // 5. Android Mipmap Target Directories
  const resDirectories = [
    './react-native-app/android/app/src/main/res'
  ];

  const densities = [
    { dir: 'mipmap-mdpi', size: 48, fgSize: 108 },
    { dir: 'mipmap-hdpi', size: 72, fgSize: 162 },
    { dir: 'mipmap-xhdpi', size: 96, fgSize: 216 },
    { dir: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
    { dir: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
  ];

  for (const resDir of resDirectories) {
    if (!fs.existsSync(resDir)) {
      fs.mkdirSync(resDir, { recursive: true });
    }

    for (const { dir, size, fgSize } of densities) {
      const targetPath = path.join(resDir, dir);
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }

      // Legacy Square launcher icon
      await sharp(fullBuffer)
        .resize(size, size)
        .toFile(path.join(targetPath, 'ic_launcher.png'));

      // Legacy Round launcher icon
      await sharp(roundBuffer)
        .resize(size, size)
        .toFile(path.join(targetPath, 'ic_launcher_round.png'));

      // Adaptive Foreground launcher icon
      await sharp(Buffer.from(foregroundIconSvg))
        .resize(fgSize, fgSize)
        .toFile(path.join(targetPath, 'ic_launcher_foreground.png'));

      // Android 13+ Monochrome launcher icon
      await sharp(Buffer.from(monochromeIconSvg))
        .resize(fgSize, fgSize)
        .toFile(path.join(targetPath, 'ic_launcher_monochrome.png'));

      console.log(`Generated ${dir} icons for ${resDir}`);
    }

    // Write ic_launcher_background.xml (Deep Navy Blue #0B1A30)
    const valuesDir = path.join(resDir, 'values');
    if (!fs.existsSync(valuesDir)) fs.mkdirSync(valuesDir, { recursive: true });
    fs.writeFileSync(path.join(valuesDir, 'ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0B1A30</color>
</resources>
`);

    // Write mipmap-anydpi-v26 XMLs
    const v26Dir = path.join(resDir, 'mipmap-anydpi-v26');
    if (!fs.existsSync(v26Dir)) fs.mkdirSync(v26Dir, { recursive: true });

    fs.writeFileSync(path.join(v26Dir, 'ic_launcher.xml'), `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
`);

    fs.writeFileSync(path.join(v26Dir, 'ic_launcher_round.xml'), `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
`);
  }

  console.log("✅ All Auto Parts India brand icons generated successfully!");
}

main().catch(console.error);
