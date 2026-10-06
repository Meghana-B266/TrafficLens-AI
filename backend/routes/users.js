const express = require('express');
const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', (req, res) => {
  res.json({
    success: true,
    message: 'User profile endpoint - Coming soon!'
  });
});

module.exports = router;
