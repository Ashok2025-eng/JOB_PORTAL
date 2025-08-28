require("dotenv").config();
const nodemailer = require("nodemailer");
app.get("/test-email", async (req, res) => {
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: "assignmentwork7723@gmail.com",
      pass: "djoe kwaf pkmo bfvf",
    },
  });

  try {
    await transporter.sendMail({
      from: "assignmentwork7723@gmail.com",
      to: "assignmentwork7723@gmail.com", // Send to yourself
      subject: "Test Email",
      html: "<h2>Email service is working! 🎉</h2>",
    });
    res.json({ success: true, message: "Test email sent!" });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});