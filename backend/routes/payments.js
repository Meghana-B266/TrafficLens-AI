const express = require('express');
const router = express.Router();

// @route   GET /api/payments
// @desc    Get payment history
// @access  Private
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Payments endpoint - Coming soon!',
    data: []
  });
});

module.exports = router;
