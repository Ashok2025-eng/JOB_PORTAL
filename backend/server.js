const express = require("express");
const app = express();
const PORT = 5000;
const cors = require("cors");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const pool = require("./db");

const authRoutes = require("./routes/auth");
const applicationRoutes = require("./routes/application");
const { authenticateToken} = require("./middlewares/auth.js");


app.use("/api/auth", authRoutes);
app.use("/api/application", applicationRoutes);
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.post("/api/createjob", authenticateToken, async (req, res) => {
  console.log("Creating job:", req.body);
  try {
    const { title, description, company, location, salary_range } = req.body;
    const newJob = await createJob({
      title,
      description,
      company,
      location,
      salary_range,
      posted_by: req.user.id,
    });
    res.status(201).json(newJob);
  } catch (error) {
    console.error("Error in /api/createjob:", error);
    res.status(500).json({ error: "Failed to create job" });
  }
});

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Server is working",
    timestamp: new Date().toISOString(),
  });
});

// All other API and database code (users, jobs, etc.)

app.listen(PORT, () => {
  console.log(`Server is running on port http://localhost:${PORT}`);
});
