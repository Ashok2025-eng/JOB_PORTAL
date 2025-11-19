// middleware/upload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");

// =============================================================================
// STORAGE CONFIGURATION
// =============================================================================
const createStorage = () => {
  return multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        // Create date-based folder structure: uploads/cvs/2024/01/
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");

        const uploadDir = path.join("uploads", "cvs", year.toString(), month);

        // Ensure directory exists
        await fs.ensureDir(uploadDir);

        console.log("Upload directory created/verified:", uploadDir);
        cb(null, uploadDir);
      } catch (error) {
        console.error("Error creating upload directory:", error);
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      try {
        // Create unique filename: userId_jobId_timestamp_originalname
        const userId = req.userId || "unknown";
        const jobId = req.body.jobId || "unknown";
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);

        // Clean filename (remove special characters)
        const cleanName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, "_");

        const filename = `${userId}_${jobId}_${timestamp}_${cleanName}${ext}`;

        console.log("Generated filename:", filename);
        cb(null, filename);
      } catch (error) {
        console.error("Error generating filename:", error);
        cb(error);
      }
    },
  });
};

// =============================================================================
// FILE FILTER (VALIDATION)
// =============================================================================
const fileFilter = (req, file, cb) => {
  console.log("File filter - checking file:", file.originalname, file.mimetype);

  // Allowed file types
  const allowedMimes = [
    "application/pdf",
    "application/msword", // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  ];

  // Check MIME type
  if (allowedMimes.includes(file.mimetype)) {
    console.log("File type accepted:", file.mimetype);
    cb(null, true);
  } else {
    console.log("File type rejected:", file.mimetype);
    const error = new Error(
      "Invalid file type. Only PDF, DOC, and DOCX files are allowed."
    );
    error.code = "INVALID_FILE_TYPE";
    cb(error, false);
  }
};

// =============================================================================
// MULTER CONFIGURATION
// =============================================================================
const uploadCV = multer({
  storage: createStorage(),
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1, // Only one file at a time
  },
});

// =============================================================================
// UPLOAD MIDDLEWARE WRAPPER
// =============================================================================
const handleCVUpload = (req, res, next) => {
  const upload = uploadCV.single("cv"); // 'cv' is the field name

  upload(req, res, (error) => {
    if (error) {
      console.error("Multer upload error:", error);

      // Handle different types of errors
      if (error instanceof multer.MulterError) {
        switch (error.code) {
          case "LIMIT_FILE_SIZE":
            return res.status(400).json({
              success: false,
              message: "File too large. Maximum size is 5MB.",
            });
          case "LIMIT_FILE_COUNT":
            return res.status(400).json({
              success: false,
              message: "Too many files. Only one CV file allowed.",
            });
          case "LIMIT_UNEXPECTED_FILE":
            return res.status(400).json({
              success: false,
              message: 'Unexpected field name. Use "cv" as field name.',
            });
          default:
            return res.status(400).json({
              success: false,
              message: `Upload error: ${error.message}`,
            });
        }
      } else if (error.code === "INVALID_FILE_TYPE") {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "File upload failed. Please try again.",
        });
      }
    }

    // Add file info to request for further processing
    if (req.file) {
      console.log("File uploaded successfully:", req.file.filename);
      req.fileInfo = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: req.file.path,
        mimetype: req.file.mimetype,
      };
    }

    next();
  });
};

module.exports = {
  handleCVUpload,
};