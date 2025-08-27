const express = require("express");
const app = express();
app.use(express.json());
const PORT = 5000;
const pool = require("./db");
const authRoutes = require("./routes/auth");
app.use("/api/auth",authRoutes);

app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Server is working",
    timestamp: new Date().toISOString(),
  });
});

// USERS ENDPOINTS

// Get all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch users",
    });
  }
});

async function getUsers() {
  try {
    const result = await pool.query("SELECT * FROM users");
    return result.rows;
  } catch (error) {
    console.error("Error fetching user data", error);
  }
}

// JOBS ENDPOINTS

// Get all jobs
app.get("/api/jobs", async (req, res) => {
  try {
    const jobs = await getJobs();
    res.json(jobs);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch jobs",
    });
  }
});

async function getJobs() {
  try {
    const result = await pool.query("SELECT * FROM jobs");
    return result.rows;
  } catch (error) {
    console.error("Error fetching job data", error);
  }
}

// Create job route
app.post("/api/createjobs", async (req, res) => {
  try {
    const { title, description, company, location, posted_by, salary_range } = req.body;

    const newJob = await createJob({
      title,
      description,
      company,
      salary_range,
      location,
      posted_by
    });

    res.status(201).json(newJob);
  } catch (error) {
    res.status(500).json({
      error: "Failed to create job"
    });
  }
});

async function createJob(jobData) {
  try {
    const result = await pool.query(
      `INSERT INTO jobs (title, description, company, salary_range, location, posted_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        jobData.title,
        jobData.description,
        jobData.company,
        jobData.salary_range,
        jobData.location,
        jobData.posted_by
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error creating job:", error);
    throw error;
  }
}

// APPLICATIONS ENDPOINTS

// Get all applications
app.get("/api/applications", async (req, res) => {
  try {
    const applications = await getApplications();
    res.json(applications);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch applications",
    });
  }
});

async function getApplications() {
  try {
    const result = await pool.query("SELECT * FROM applications");
    return result.rows;
  } catch (error) {
    console.error("Error fetching applications data", error);
  }
}

// Create application route
app.post("/api/createapplication", async (req, res) => {
  try {
    const { job_id, applicant_id, cover_letter, status } = req.body;

    if (!job_id || !applicant_id || !cover_letter) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newApplication = await createApplication({
      job_id,
      applicant_id,
      cover_letter,
      status // status defaults to 'pending' if not provided
    });

    res.status(201).json(newApplication);
  } catch (error) {
    res.status(500).json({
      error: "Error creating application",
    });
  }
});

async function createApplication(applicationData) {
  try {
    const result = await pool.query(
      `INSERT INTO applications (job_id, applicant_id, cover_letter, status, applied_at) 
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [
        applicationData.job_id,
        applicationData.applicant_id,
        applicationData.cover_letter,
        applicationData.status || 'pending'
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error creating application:", error);
    throw error;
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
