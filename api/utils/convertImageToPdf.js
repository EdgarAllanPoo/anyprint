const { execFile } = require("child_process");
const path = require("path");

const IM_PATH =
  process.platform === "darwin"
    ? "magick"    // macOS (ImageMagick 7)
    : "convert";   // linux server 22.04 (ImageMagick 6)

async function convertImageToPdf(inputPath, outputDir) {
  return new Promise((resolve, reject) => {
    const outputFile = path.join(
      outputDir,
      path.basename(inputPath, path.extname(inputPath)) + ".pdf"
    );

    execFile(
      IM_PATH,
      ["-density", "300", inputPath, outputFile],
      (error) => {
        if (error) return reject(error);
        resolve(outputFile);
      }
    );
  });
}

module.exports = { convertImageToPdf };
