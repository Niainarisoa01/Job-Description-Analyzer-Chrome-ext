const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const { JSDOM } = require('jsdom');
const { SVGPathData } = require('svg-pathdata');
const svgToDataURL = require('svg-to-dataurl');

// Sizes of icons to generate
const sizes = [16, 48, 128];

// Path to the SVG icons
const iconsDir = path.join(__dirname, '../public/icons');

// Function to convert SVG to PNG
async function convertSvgToPng(svgPath, pngPath, size) {
  try {
    // Read the SVG file
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    
    // Convert SVG to data URL
    const dataUrl = svgToDataURL(svgContent);
    
    // Create a canvas with the desired size
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Load the SVG as an image
    const img = await loadImage(dataUrl);
    
    // Draw the image on the canvas
    ctx.drawImage(img, 0, 0, size, size);
    
    // Convert canvas to PNG buffer
    const buffer = canvas.toBuffer('image/png');
    
    // Write the PNG file
    fs.writeFileSync(pngPath, buffer);
    
    console.log(`Converted ${svgPath} to ${pngPath}`);
  } catch (error) {
    console.error(`Error converting ${svgPath} to PNG:`, error);
  }
}

// Main function
async function main() {
  // Create the icons directory if it doesn't exist
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  
  // Convert each size
  for (const size of sizes) {
    const svgPath = path.join(iconsDir, `icon${size}.svg`);
    const pngPath = path.join(iconsDir, `icon${size}.png`);
    
    // Check if the SVG file exists
    if (fs.existsSync(svgPath)) {
      await convertSvgToPng(svgPath, pngPath, size);
    } else {
      console.error(`SVG file not found: ${svgPath}`);
    }
  }
}

// Run the main function
main().catch(console.error); 