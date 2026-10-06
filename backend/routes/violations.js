const express = require('express');
const router = express.Router();

// @route   GET /api/violations
// @desc    Get violation types
// @access  Public
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Violations endpoint - Coming soon!',
    data: [
      { id: 'no_helmet', name: 'No Helmet', fine: 500 },
      { id: 'signal_jump', name: 'Signal Jump', fine: 1000 },
      { id: 'wrong_side', name: 'Wrong Side Driving', fine: 1500 }
    ]
  });
});

module.exports = router;
