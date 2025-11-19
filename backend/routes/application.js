// routes/applications.js
const express = require("express");
const pool = require("../db");
const { authenticateToken } = require("../middlewares/auth");
const { handleCVUpload } = require("../middlewares/upload");
const { deleteFile, formatFileSize } = require("../utils/file");

const router = express.Router();

// =============================================================================
// DATABASE HELPER FUNCTIONS
// =============================================================================

// Create job application function (similar to your createJob pattern)
async function createJobApplication(applicationData) {
  try {
    const result = await pool.query(
      `INSERT INTO applications (job_id, user_id, cover_letter, 
       cv_filename, cv_original_name, cv_file_size, cv_upload_date, 
       status, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        applicationData.job_id,
        applicationData.user_id,
        applicationData.cover_letter,
        applicationData.cv_filename,
        applicationData.cv_original_name,
        applicationData.cv_file_size,
        applicationData.cv_upload_date,
        applicationData.status || "pending",
        new Date(),
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error creating job application:", error);
    throw error;
  }
}

// Get job application by ID
async function getJobApplicationById(applicationId, userId) {
  try {
    const result = await pool.query(
      `SELECT a.*, j.title, j.company, j.location 
       FROM applications a 
       JOIN jobs j ON a.job_id = j.id 
       WHERE a.id = $1 AND a.user_id = $2`,
      [applicationId, userId]
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error getting job application:", error);
    throw error;
  }
}

// Get all applications for a user
async function getUserApplications(userId) {
  try {
    const result = await pool.query(
      `SELECT a.*, j.title, j.company, j.location, j.salary_range
       FROM applications a 
       JOIN jobs j ON a.job_id = j.id 
       WHERE a.user_id = $1 
       ORDER BY a.created_at DESC`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    console.error("Error getting user applications:", error);
    throw error;
  }
}

// Check if user already applied for a job
async function checkExistingApplication(userId, jobId) {
  try {
    const result = await pool.query(
      `SELECT id FROM applications WHERE user_id = $1 AND job_id = $2`,
      [userId, jobId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error("Error checking existing application:", error);
    throw error;
  }
}

// Check if job exists
async function checkJobExists(jobId) {
  try {
    const result = await pool.query(
      `SELECT id, title, company FROM jobs WHERE id = $1`,
      [jobId]
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error checking job existence:", error);
    throw error;
  }
}

// =============================================================================
// ROUTES
// =============================================================================

// CREATE APPLICATION API (replaces your createjob pattern)
router.post(
  "/createapplication",
  authenticateToken,
  handleCVUpload,
  async (req, res) => {
    console.log("Creating job application:", req.body);
    console.log("File info:", req.fileInfo);

    try {
      const { job_id, cover_letter } = req.body;
      const user_id = req.userId; // From auth middleware
      const fileInfo = req.fileInfo; // From upload middleware

      // ===== VALIDATION =====
      if (!job_id) {
        // Clean up uploaded file if validation fails
        if (fileInfo) {
          await deleteFile(fileInfo.path);
        }
        return res.status(400).json({
          success: false,
          error: "Job ID is required",
        });
      }

      if (!fileInfo) {
        return res.status(400).json({
          success: false,
          error: "CV file is required",
        });
      }

      // ===== CHECK IF JOB EXISTS =====
      const job = await checkJobExists(job_id);
      if (!job) {
        // Clean up uploaded file
        if (fileInfo) {
          await deleteFile(fileInfo.path);
        }
        return res.status(404).json({
          success: false,
          error: "Job not found",
        });
      }

      // ===== CHECK IF ALREADY APPLIED =====
      const alreadyApplied = await checkExistingApplication(user_id, job_id);
      if (alreadyApplied) {
        // Clean up uploaded file
        if (fileInfo) {
          await deleteFile(fileInfo.path);
        }
        return res.status(400).json({
          success: false,
          error: "You have already applied for this job",
        });
      }

      // ===== CREATE APPLICATION =====
      const newApplication = await createJobApplication({
        job_id: parseInt(job_id),
        user_id,
        cover_letter: cover_letter || null,
        cv_filename: fileInfo.filename,
        cv_original_name: fileInfo.originalName,
        cv_file_size: fileInfo.size,
        cv_upload_date: new Date(),
        status: "pending",
      });

      console.log("Application created successfully:", newApplication.id);

      // ===== SUCCESS RESPONSE =====
      res.status(201).json({
        success: true,
        message: "Application submitted successfully!",
        application: {
          id: newApplication.id,
          jobId: newApplication.job_id,
          jobTitle: job.title,
          company: job.company,
          coverLetter: newApplication.cover_letter,
          cvInfo: {
            originalName: fileInfo.originalName,
            filename: fileInfo.filename,
            size: formatFileSize(fileInfo.size),
            uploadDate: newApplication.cv_upload_date,
          },
          status: newApplication.status,
          appliedAt: newApplication.created_at,
        },
      });
    } catch (error) {
      console.error("Error in /api/createapplication:", error);

      // Clean up uploaded file on error
      if (req.fileInfo) {
        await deleteFile(req.fileInfo.path);
      }

      res.status(500).json({
        success: false,
        error: "Failed to create job application",
      });
    }
  }
);

// GET USER'S APPLICATIONS
router.get("/api/myapplications", authenticateToken, async (req, res) => {
  console.log("Getting applications for user:", req.userId);

  try {
    const applications = await getUserApplications(req.userId);

    // Format response
    const formattedApplications = applications.map((app) => ({
      id: app.id,
      jobId: app.job_id,
      jobTitle: app.title,
      company: app.company,
      location: app.location,
      salaryRange: app.salary_range,
      coverLetter: app.cover_letter,
      status: app.status,
      cvInfo: app.cv_filename
        ? {
            originalName: app.cv_original_name,
            filename: app.cv_filename,
            size: formatFileSize(app.cv_file_size || 0),
            uploadDate: app.cv_upload_date,
          }
        : null,
      appliedAt: app.created_at,
    }));

    res.json({
      success: true,
      applications: formattedApplications,
      count: formattedApplications.length,
    });
  } catch (error) {
    console.error("Error in /api/myapplications:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get applications",
    });
  }
});

// GET SINGLE APPLICATION
router.get("/api/application/:id", authenticateToken, async (req, res) => {
  console.log("Getting application:", req.params.id);

  try {
    const applicationId = req.params.id;
    const userId = req.userId;

    const application = await getJobApplicationById(applicationId, userId);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: "Application not found",
      });
    }

    // Format response
    const formattedApplication = {
      id: application.id,
      jobId: application.job_id,
      jobTitle: application.title,
      company: application.company,
      location: application.location,
      coverLetter: application.cover_letter,
      status: application.status,
      cvInfo: application.cv_filename
        ? {
            originalName: application.cv_original_name,
            filename: application.cv_filename,
            size: formatFileSize(application.cv_file_size || 0),
            uploadDate: application.cv_upload_date,
          }
        : null,
      appliedAt: application.created_at,
    };

    res.json({
      success: true,
      application: formattedApplication,
    });
  } catch (error) {
    console.error("Error in /api/application/:id:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get application",
    });
  }
});

// DELETE APPLICATION
router.delete("/api/application/:id", authenticateToken, async (req, res) => {
  console.log("Deleting application:", req.params.id);

  try {
    const applicationId = req.params.id;
    const userId = req.userId;

    // Get application details first
    const application = await getJobApplicationById(applicationId, userId);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: "Application not found",
      });
    }

    // Delete from database
    await pool.query("DELETE FROM applications WHERE id = $1", [applicationId]);

    // Delete CV file if exists
    if (application.cv_filename) {
      // You might need to implement file search logic here
      // based on your date-based folder structure
      console.log("TODO: Delete CV file:", application.cv_filename);
    }

    res.json({
      success: true,
      message: "Application deleted successfully",
    });
  } catch (error) {
    console.error("Error in /api/application/:id (DELETE):", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete application",
    });
  }
});

// DOWNLOAD CV
router.get("/api/application/:id/cv", authenticateToken, async (req, res) => {
  console.log("Downloading CV for application:", req.params.id);

  try {
    const applicationId = req.params.id;
    const userId = req.userId;

    const application = await getJobApplicationById(applicationId, userId);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: "Application not found",
      });
    }

    if (!application.cv_filename) {
      return res.status(404).json({
        success: false,
        error: "No CV file found",
      });
    }

    // Here you would implement file serving logic
    // based on your date-based folder structure
    res.json({
      success: true,
      message: "CV download endpoint - implement file serving logic here",
      filename: application.cv_filename,
      originalName: application.cv_original_name,
    });
  } catch (error) {
    console.error("Error in CV download:", error);
    res.status(500).json({
      success: false,
      error: "Failed to download CV",
    });
  }
});

module.exports = router;