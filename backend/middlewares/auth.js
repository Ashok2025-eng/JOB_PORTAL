const jwt = require('jsonwebtoken');
const pool = require('../db');

const authenticateToken = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access token required' 
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const userResult = await pool.query(
            'SELECT id, full_name, email, email_verified FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Add user to request object
        req.user = userResult.rows[0];
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(403).json({ 
            success: false, 
            message: 'Invalid or expired token' 
        });
    }
};

module.exports = { authenticateToken };