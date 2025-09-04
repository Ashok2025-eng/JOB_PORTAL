require("dotenv").config();
const nodemailer = require("nodemailer");

const createTransporter = () => {
    return nodemailer.createTransport({ 
        service: 'gmail', // This automatically sets host and port for Gmail
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS // not EMAIL_PASS
// Use your app password here
        },
        // Additional options for better reliability
        tls: {
            rejectUnauthorized: false
        }
    });
};

// Test email connection
const testEmailConnection = async () => {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        console.log('Email service connected successfully');
        return true;
    } catch (error) {
        console.error('Email service connection failed:', error.message);
        return false;
    }
};

// Send verification email
const sendVerificationEmail = async (email, token, name) => {
    try {
        const transporter = createTransporter();
        const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
        
        const mailOptions = {
            from: {
                name: 'Job Portal',
                address: process.env.SMTP_USER
            },
            to: email,
            subject: 'Verify Your Email - Job Portal',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Email Verification</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            line-height: 1.6;
                            margin: 0;
                            padding: 0;
                            background-color: #f4f4f4;
                        }
                        .container {
                            max-width: 600px;
                            margin: 20px auto;
                            background: white;
                            border-radius: 10px;
                            overflow: hidden;
                            box-shadow: 0 0 20px rgba(0,0,0,0.1);
                        }
                        .header {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            padding: 30px;
                            text-align: center;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 28px;
                        }
                        .content {
                            padding: 40px 30px;
                        }
                        .welcome {
                            font-size: 20px;
                            color: #333;
                            margin-bottom: 20px;
                        }
                        .message {
                            color: #666;
                            margin-bottom: 30px;
                            font-size: 16px;
                        }
                        .btn {
                            display: inline-block;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            padding: 15px 30px;
                            text-decoration: none;
                            border-radius: 50px;
                            font-weight: bold;
                            font-size: 16px;
                            transition: transform 0.2s;
                        }
                        .btn:hover {
                            transform: translateY(-2px);
                        }
                        .alternative-link {
                            margin-top: 30px;
                            padding: 20px;
                            background-color: #f8f9fa;
                            border-radius: 8px;
                            border-left: 4px solid #667eea;
                        }
                        .footer {
                            background-color: #f8f9fa;
                            padding: 20px 30px;
                            text-align: center;
                            color: #666;
                            font-size: 14px;
                        }
                        .warning {
                            color: #e74c3c;
                            font-size: 14px;
                            margin-top: 20px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1> Welcome to Job Portal!</h1>
                        </div>
                        <div class="content">
                            <div class="welcome">Hello ${name}! 👋</div>
                            <div class="message">
                                Thank you for registering with Job Portal. To complete your registration and start exploring job opportunities, please verify your email address by clicking the button below.
                            </div>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${verificationUrl}" class="btn">
                                     Verify My Email
                                </a>
                            </div>
                            
                            <div class="alternative-link">
                                <strong>Button not working?</strong><br>
                                Copy and paste this link in your browser:<br>
                                <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">
                                    ${verificationUrl}
                                </a>
                            </div>
                            
                            <div class="warning">
                                 This verification link will expire in 24 hours for security reasons.
                            </div>
                        </div>
                        <div class="footer">
                            <p>If you didn't create an account with Job Portal, please ignore this email.</p>
                            <p>© 2024 Job Portal. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log(`Verification email sent to ${email}`);
        return { success: true, messageId: result.messageId };
        
    } catch (error) {
        console.error('Failed to send verification email:', error);
        throw new Error(`Failed to send verification email: ${error.message}`);
    }
};

// Send password reset email
const sendPasswordResetEmail = async (email, token, name) => {
    try {
        const transporter = createTransporter();
        const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
        
        const mailOptions = {
            from: {
                name: 'Job Portal Security',
                address: process.env.SMTP_USER
            },
            to: email,
            subject: 'Password Reset Request - Job Portal',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Password Reset</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            line-height: 1.6;
                            margin: 0;
                            padding: 0;
                            background-color: #f4f4f4;
                        }
                        .container {
                            max-width: 600px;
                            margin: 20px auto;
                            background: white;
                            border-radius: 10px;
                            overflow: hidden;
                            box-shadow: 0 0 20px rgba(0,0,0,0.1);
                        }
                        .header {
                            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                            color: white;
                            padding: 30px;
                            text-align: center;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 28px;
                        }
                        .content {
                            padding: 40px 30px;
                        }
                        .greeting {
                            font-size: 20px;
                            color: #333;
                            margin-bottom: 20px;
                        }
                        .message {
                            color: #666;
                            margin-bottom: 30px;
                            font-size: 16px;
                        }
                        .btn {
                            display: inline-block;
                            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                            color: white;
                            padding: 15px 30px;
                            text-decoration: none;
                            border-radius: 50px;
                            font-weight: bold;
                            font-size: 16px;
                            transition: transform 0.2s;
                        }
                        .btn:hover {
                            transform: translateY(-2px);
                        }
                        .alternative-link {
                            margin-top: 30px;
                            padding: 20px;
                            background-color: #f8f9fa;
                            border-radius: 8px;
                            border-left: 4px solid #e74c3c;
                        }
                        .footer {
                            background-color: #f8f9fa;
                            padding: 20px 30px;
                            text-align: center;
                            color: #666;
                            font-size: 14px;
                        }
                        .security-notice {
                            background-color: #fff3cd;
                            border: 1px solid #ffeaa7;
                            border-radius: 8px;
                            padding: 15px;
                            margin: 20px 0;
                            color: #856404;
                        }
                        .warning {
                            color: #e74c3c;
                            font-size: 14px;
                            font-weight: bold;
                            margin-top: 20px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1> Password Reset</h1>
                        </div>
                        <div class="content">
                            <div class="greeting">Hi ${name},</div>
                            <div class="message">
                                We received a request to reset your password for your Job Portal account. If you made this request, click the button below to reset your password.
                            </div>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${resetUrl}" class="btn">
                                     Reset My Password
                                </a>
                            </div>
                            
                            <div class="alternative-link">
                                <strong>Button not working?</strong><br>
                                Copy and paste this link in your browser:<br>
                                <a href="${resetUrl}" style="color: #e74c3c; word-break: break-all;">
                                    ${resetUrl}
                                </a>
                            </div>
                            
                            <div class="security-notice">
                                <strong> Security Notice:</strong><br>
                                If you didn't request this password reset, please ignore this email. Your password will remain unchanged and secure.
                            </div>
                            
                            <div class="warning">
                                 This password reset link will expire in 1 hour for security reasons.
                            </div>
                        </div>
                        <div class="footer">
                            <p>For security reasons, this link can only be used once.</p>
                            <p>© 2024 Job Portal. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log(` Password reset email sent to ${email}`);
        return { success: true, messageId: result.messageId };
        
    } catch (error) {
        console.error(' Failed to send password reset email:', error);
        throw new Error(`Failed to send password reset email: ${error.message}`);
    }
};

// Send welcome email (after email verification)
const sendWelcomeEmail = async (email, name) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: {
                name: 'Job Portal Team',
                address: process.env.SMTP_USER
            },
            to: email,
            subject: ' Welcome to Job Portal - Your account is now active!',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Welcome to Job Portal</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            line-height: 1.6;
                            margin: 0;
                            padding: 0;
                            background-color: #f4f4f4;
                        }
                        .container {
                            max-width: 600px;
                            margin: 20px auto;
                            background: white;
                            border-radius: 10px;
                            overflow: hidden;
                            box-shadow: 0 0 20px rgba(0,0,0,0.1);
                        }
                        .header {
                            background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
                            color: white;
                            padding: 40px 30px;
                            text-align: center;
                        }
                        .content {
                            padding: 40px 30px;
                        }
                        .btn {
                            display: inline-block;
                            background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
                            color: white;
                            padding: 15px 30px;
                            text-decoration: none;
                            border-radius: 50px;
                            font-weight: bold;
                            font-size: 16px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1> Welcome ${name}!</h1>
                            <p>Your account has been verified successfully</p>
                        </div>
                        <div class="content">
                            <p>Congratulations! Your email has been verified and your Job Portal account is now active.</p>
                            <p>You can now:</p>
                            <ul>
                                <li>Browse thousands of job opportunities</li>
                                <li>Apply to jobs that match your skills</li>
                                <li>Create and manage your professional profile</li>
                                <li>Set up job alerts</li>
                            </ul>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${process.env.CLIENT_URL}/login" class="btn">
                                     Start Job Hunting
                                </a>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log(`Welcome email sent to ${email}`);
        return { success: true, messageId: result.messageId };
        
    } catch (error) {
        console.error('Failed to send welcome email:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    testEmailConnection,
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendWelcomeEmail
};
