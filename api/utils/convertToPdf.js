const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs/promises");

const SOFFICE_PATH =
  process.platform === "darwin"
    ? "/Applications/LibreOffice.app/Contents/MacOS/soffice"
    : "soffice";

async function convertToPdf(inputPath, outputDir) {
  return new Promise((resolve, reject) => {
    execFile(
      SOFFICE_PATH,
      [
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        outputDir,
        inputPath,
      ],
      (error) => {
        if (error) return reject(error);

        const outputFile =
          path.join(
            outputDir,
            path.basename(inputPath, path.extname(inputPath)) + ".pdf"
          );

        resolve(outputFile);
      }
    );
  });
}

module.exports = { convertToPdf };
