const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - user must be logged in
const protect = async (req, res, next) => {
    try {
        let token;

        // Check Authorization header
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer ')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized. Please login.'
            });
        }

        // Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find user
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found.'
            });
        }

        // Attach user to request
        req.user = user;

        next();

    } catch (error) {
        console.error('Authentication error:', error);

        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token.'
        });
    }
};


// Admin-only access
const adminOnly = (req, res, next) => {

    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required.'
        });
    }

    next();
};


module.exports = {
    protect,
    adminOnly
};