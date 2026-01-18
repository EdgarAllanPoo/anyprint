const { execFile } = require("child_process");
const path = require("path");

const IM_PATH = "convert"; // Ubuntu uses convert-im6 alias

// A4 @ 300 DPI
const A4_WIDTH = 2480;
const A4_HEIGHT = 3508;

async function convertImageToPdf(inputPath, outputDir) {
  return new Promise((resolve, reject) => {
    const outputFile = path.join(
      outputDir,
      path.basename(inputPath, path.extname(inputPath)) + ".pdf"
    );

    execFile(
      IM_PATH,
      [
        inputPath,
        "-units", "PixelsPerInch",
        "-density", "300",
        "-resize", `${A4_WIDTH}x${A4_HEIGHT}`,
        "-gravity", "center",
        "-extent", `${A4_WIDTH}x${A4_HEIGHT}`,
        outputFile
      ],
      (error) => {
        if (error) return reject(error);
        resolve(outputFile);
      }
    );
  });
}

module.exports = { convertImageToPdf };
