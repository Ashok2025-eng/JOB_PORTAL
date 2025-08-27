const express = require("express");
const pool = require("../db");

const {
  hashPassword,
  comparePassword,
  generateToken,
  isValidEmail,
  isValidPassword,
} = require("../utils/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log("Registration attempt:", { name, email });

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters with letters and numbers",
      });
    }

    const existingUserQuery = "SELECT id FROM users WHERE email = $1";
    const existingUser = await pool.query(existingUserQuery, [
      email.toLowerCase(),
    ]);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const passwordHash = await hashPassword(password);
    console.log("Password hashed successfully");

    const insertUserQuery = `
        INSERT INTO users (full_name, email, password, user_type) 
        VALUES ($1, $2, $3, $4) 
        RETURNING id, full_name, email, user_type, created_at
    `;

    const result = await pool.query(insertUserQuery, [
        name.trim(),
        email.toLowerCase().trim(),
        passwordHash,
        'jobseeker'
    ]);

    const newUser = result.rows[0];
    console.log("User created:", newUser.id);

    res.status(201).json({
      success: true,
      message: "User registered successfully!",
      user: {
        id: newUser.id,
        name: newUser.full_name, // Fix: Use full_name
        email: newUser.email,
        userType: newUser.user_type,
        createdAt: newUser.created_at,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === "23505") {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Login attempt:", { email });

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const findUserQuery = `
        SELECT id, full_name, email, password, user_type, created_at 
        FROM users 
        WHERE email = $1
    `;
    const result = await pool.query(findUserQuery, [email.toLowerCase()]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];
    console.log("User found:", user.id);

    // Fix: Use user.password (not user.password_hash)
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      console.log("Invalid password for user:", user.id);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    console.log("Password verified for user:", user.id);

    // Fix: Pass user.user_type to generateToken
    const token = generateToken(user.id, user.user_type);
    console.log("Token generated for user:", user.id);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.full_name, // Fix: Use full_name
        email: user.email,
        userType: user.user_type,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth routes are working!",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
