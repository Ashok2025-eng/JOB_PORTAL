// utils/fileUtils.js
const fs = require("fs-extra");
const path = require("path");

// =============================================================================
// FILE VALIDATION UTILITIES
// =============================================================================

// Check if file exists
const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

// Get file size in human readable format
const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Get file extension
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

// Validate file type by extension
const isValidCVFile = (filename) => {
  const validExtensions = [".pdf", ".doc", ".docx"];
  const ext = getFileExtension(filename);
  return validExtensions.includes(ext);
};

// Delete file safely
const deleteFile = async (filePath) => {
  try {
    if (await fileExists(filePath)) {
      await fs.remove(filePath);
      console.log("File deleted successfully:", filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
};

// Create file info object
const createFileInfo = (file) => {
  if (!file) return null;

  return {
    filename: file.filename,
    originalName: file.originalname,
    size: file.size,
    sizeFormatted: formatFileSize(file.size),
    extension: getFileExtension(file.filename),
    mimetype: file.mimetype,
    uploadDate: new Date(),
  };
};

// Validate CV file requirements
const validateCVFile = (file) => {
  const errors = [];

  if (!file) {
    errors.push("CV file is required");
    return { isValid: false, errors };
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    errors.push(
      `File size too large. Maximum size is ${formatFileSize(maxSize)}`
    );
  }

  // Check file type
  if (!isValidCVFile(file.originalname)) {
    errors.push("Invalid file type. Only PDF, DOC, and DOCX files are allowed");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  fileExists,
  formatFileSize,
  getFileExtension,
  isValidCVFile,
  deleteFile,
  createFileInfo,
  validateCVFile,
};