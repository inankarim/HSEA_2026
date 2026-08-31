const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ASSETS_DIR = path.join(__dirname, "../public/assets");
const QUALITY = 75;
const MAX_WIDTH = 1920;  // Resize to max 1920px wide

const IMAGES = [
  "High-risecorestructure.jpg",
  "Reinforcedconcretejoint.jpg",
  "Urbanbridgespan.jpg",
  "Sustainableurbanskyline.jpg",
  "visionary_design.jpg",
  "high_performance.jpg",
  "advance.jpg",
];

async function compressImage(filename) {
  const inputPath = path.join(ASSETS_DIR, filename);
  const outputPath = path.join(ASSETS_DIR, filename.replace(/\.(jpg|jpeg|png)$/i, ".webp"));

  if (!fs.existsSync(inputPath)) {
    console.warn(`⚠️  File not found: ${inputPath}`);
    return;
  }

  try {
    const inputStats = fs.statSync(inputPath);
    const inputSizeMB = (inputStats.size / (1024 * 1024)).toFixed(2);

    // Resize + compress to WebP
    await sharp(inputPath)
      .resize(MAX_WIDTH, MAX_WIDTH, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(outputPath);

    const outputStats = fs.statSync(outputPath);
    const outputSizeMB = (outputStats.size / (1024 * 1024)).toFixed(2);
    const reduction = (((inputStats.size - outputStats.size) / inputStats.size) * 100).toFixed(1);

    console.log(`✅ ${filename}`);
    console.log(`   ${inputSizeMB}MB → ${outputSizeMB}MB (${reduction}% reduction)\n`);
  } catch (err) {
    console.error(`❌ Error processing ${filename}:`, err.message);
  }
}

async function main() {
  console.log("\n🖼️  Image Compression + Resize Script");
  console.log("====================================\n");
  console.log(`📁 Processing: ${ASSETS_DIR}`);
  console.log(`📐 Resizing to max width: ${MAX_WIDTH}px\n`);
  console.log(`📊 Compressing ${IMAGES.length} images...\n`);

  for (const filename of IMAGES) {
    await compressImage(filename);
  }

  console.log("====================================");
  console.log("✨ Compression complete!\n");
}

main().catch(console.error);
