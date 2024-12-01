const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

// Set the path to the ffmpeg executable
const ffmpegPath = "C:\\ffmpeg\\bin\\ffmpeg.exe"; // Ensure this path points to the ffmpeg executable on your system
ffmpeg.setFfmpegPath(ffmpegPath);

// Middleware
app.use(cors());
app.use(express.static("uploads"));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log("Created uploads directory.");
}

// Storage configuration for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// API endpoint to handle video compression
app.post("/api/compress", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  console.log("Uploaded file details:", req.file);

  const filePath = req.file.path;
  const compressedFilePath = path.join(
    uploadsDir,
    `compressed-${req.file.filename}`
  );

  console.log("Original file path:", filePath);
  console.log("Compressed file path:", compressedFilePath);

  ffmpeg(filePath)
    .output(compressedFilePath)
    .videoCodec("libx264")
    .audioCodec("aac")
    .outputOptions("-crf 30") // Higher CRF for better compression
    .outputOptions("-preset medium") // Better compression, slower
    .outputOptions("-b:v 500k") // Lower video bitrate
    .outputOptions("-b:a 64k") // Lower audio bitrate
    //  .videoFilters("scale=iw*0.3:ih*0.3") // Reduce resolution to 50%
    .videoFilters("scale=trunc(iw*0.9/2)*2:trunc(ih*0.9/2)*2")

    .on("progress", progress => {
      console.log("Compression progress:", progress);
    })
    .on("end", () => {
      console.log("Compression completed successfully.");
      fs.unlinkSync(filePath); // Clean up the original file
      res.json({ compressedVideoPath: compressedFilePath });
    })
    .on("error", err => {
      console.error("Error compressing video:", err);
      res.status(500).send("Error compressing video");
    })
    .run();
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
