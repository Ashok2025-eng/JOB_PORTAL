const express = require("express");
const pool = require("../db");
const { testEmailConnection,sendWelcomeEmail } = require("../emailservice");




const {
  hashPassword,
  comparePassword,
  generateToken,
  isValidEmail,
  isValidPassword,
  generateRandomToken   // <-- ADD THIS!!
} = require("../utils/auth");

const { sendVerificationEmail } = require("../emailservice");
const{
  requireEmailVerified,
} = require("../middlewares/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, user_type } = req.body; // Added user_type

    console.log("Registration attempt:", { name, email, user_type });

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

    // Added user_type validation
    if (user_type && user_type !== "admin" && user_type !== "jobseeker") {
        return res.status(400).json({
            success: false,
            message: "Invalid user type"
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

   const verificationtoken = generateRandomToken(); // Use your util; don't use JWT for this
// Add the field 'false' for email_verified, then the verification token:
const insertUserQuery = `
    INSERT INTO users (full_name, email, password, user_type, email_verified, verification_token) 
    VALUES ($1, $2, $3, $4, $5, $6) 
    RETURNING id, full_name, email, user_type, created_at
`;
const result = await pool.query(insertUserQuery, [
    name.trim(),
    email.toLowerCase().trim(),
    passwordHash,
    user_type || 'jobseeker',
    false,
    verificationtoken
]);


    const newUser = result.rows[0];
    console.log("User created:", newUser.id);

    try{
      await sendVerificationEmail(email,verificationtoken,name);
      console.log("Verification email sent successfully");
    } catch (emailError){
      console.log("Email sendind failed:",emailError);
    }

  res.status(201).json({
      success: true,
      message: `Registration successful! 
      Please check your email and click the verification 
      link to activate your account.`,
      user: {
        id: newUser.id,
        name: newUser.full_name,
        email: newUser.email,
        createdAt: newUser.created_at,
        userType: newUser.user_type,
        emailVerified: false,
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

router.post("/login",  async (req, res) => {
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
        SELECT id, full_name, email,email_verified, password, user_type, created_at 
        FROM users 
        WHERE email = $1
    `;
    const result = await pool.query(findUserQuery, [email.toLowerCase()]);


    if (result.rows[0] && !result.rows[0].email_verified){
      return res.status(401).json({
        success : false,
        message: "Please verify your email before logging in",
      }
       
      )
    }
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];
    console.log("User found:", user.id);

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      console.log("Invalid password for user:", user.id);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    console.log("Password verified for user:", user.id);

    const token = generateToken(user.id, user.user_type);
    console.log("Token generated for user:", user.id);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.full_name,
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
router.get("/test-email", async (req, res) => {
    const result = await testEmailConnection();
    res.json({ connected: result });
});

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Auth routes are working!",
    timestamp: new Date().toISOString(),
  });
});

router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Verification token is required'
            });
        }

        // ===== FIND USER WITH TOKEN =====
        const result = await pool.query(`
    SELECT id, full_name, email, email_verified FROM users WHERE verification_token = $1
`, [token]);

if (result.rows.length === 0) {
    return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
    });
}
const user = result.rows[0]; // <-- user is defined here!

// Now you can use user.email and user.full_name
await sendWelcomeEmail(user.email, user.full_name);


        // Check if already verified
        if (user.email_verified) {
            return res.json({
                success: true,
                message: 'Email is already verified'
            });
        }

        // ===== VERIFY EMAIL =====
        await pool.query(`
            UPDATE users 
            SET email_verified = true, 
                verification_token = null,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [user.id]);

        console.log('Email verified for user:', user.id);

        // ===== SEND WELCOME EMAIL =====
        try {
            await sendWelcomeEmail(user.email, user.full_name);
        } catch (emailError) {
            console.error('Welcome email failed:', emailError);
            // Don't fail verification if welcome email fails
        }

        res.json({
            success: true,
            message: 'Email verified successfully! Your account is now active.',
            user: {
                id: user.id,
                name: user.full_name,
                email: user.email,
                emailVerified: true
            }
        });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
// GET route for email verification (handles email link clicks)
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query; // GET request uses query params

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Verification token is missing from the link.'
            });
        }

        // Same logic as your POST route
        const result = await pool.query(`
            SELECT id, full_name, email, email_verified FROM users WHERE verification_token = $1
        `, [token]);

        if (result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification token.'
            });
        }

        const user = result.rows[0];

        if (user.email_verified) {
            return res.json({
                success: true,
                message: 'Your email is already verified!'
            });
        }

        // Verify the email
        await pool.query(`
            UPDATE users 
            SET email_verified = true, 
                verification_token = null
            WHERE id = $1
        `, [user.id]);

        // Send welcome email
        try {
            await sendWelcomeEmail(user.email, user.full_name);
        } catch (emailError) {
            console.error('Welcome email failed:', emailError);
        }

        res.json({
            success: true,
            message: 'Email verified successfully! Your account is now active.',
            user: {
                id: user.id,
                email: user.email,
                emailVerified: true
            }
        });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});


module.exports = router;
