// Installs the chosen icon picture everywhere: node _tools/install-icon.mjs <picture.png>
//   the app icons (iOS 1024, Android via resources/), the website's home-screen and PWA icons, and the favicon (a close crop of the nav arrow, since the title cannot be read that small)
import fs from 'node:fs';
import sharp from 'sharp';
const src = process.argv[2];
if (!src) { console.log('usage: install-icon.mjs <picture.png>'); process.exit(1); }
const flat = (img) => img.flatten({ background: '#1a1210' }).removeAlpha();
// the full picture, square
const full = await sharp(src).resize(1024, 1024, { fit: 'cover' }).png().toBuffer();
// the arrow close up for the tiny sizes: the arrow lies about x 270..755, y 250..785 in the 1024 picture
const crop = await sharp(full).extract({ left: 232, top: 232, width: 560, height: 560 }).png().toBuffer();

await flat(sharp(full)).toFile('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
await flat(sharp(full).resize(512, 512)).png().toFile('public/icon-512.png');
await flat(sharp(full).resize(192, 192)).png().toFile('public/icon-192.png');
await flat(sharp(full).resize(180, 180)).png().toFile('public/apple-touch-icon.png');
await sharp(crop).resize(32, 32).png().toFile('public/favicon-32.png');
// the SVG favicon: the picture itself, as the browsers that use it scale it down
const small = await sharp(crop).resize(256, 256).png().toBuffer();
fs.writeFileSync('public/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><image width="256" height="256" href="data:image/png;base64,${small.toString('base64')}"/></svg>\n`);
// Android (capacitor-assets): the whole picture, and an adaptive pair (the picture sits inside the safe zone over a dark wood background)
await flat(sharp(full)).toFile('resources/icon-only.png');
await sharp({ create: { width: 1024, height: 1024, channels: 3, background: '#1a1210' } }).png().toFile('resources/icon-background.png');
await sharp(full).resize(700, 700).extend({ top: 162, bottom: 162, left: 162, right: 162, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile('resources/icon-foreground.png');
console.log('installed');
