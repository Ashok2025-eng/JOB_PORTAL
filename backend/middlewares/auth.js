const jwt = require("jsonwebtoken");
const pool = require("../db");

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database (ALSO get user_type)
    const userResult = await pool.query(
      "SELECT id, full_name, email, email_verified, user_type FROM users WHERE id = $1",
      [decoded.userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }
    req.user = userResult.rows[0];
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }
  if (req.user.user_type !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }
  next();
};

const requireEmailVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }
  if (!req.user.email_verified) {
    return res.status(403).json({
      success: false,
      message: "Email verification required. Please check your email.",
    });
  }
  next();
};

module.exports = { authenticateToken, requireAdmin, requireEmailVerified };
