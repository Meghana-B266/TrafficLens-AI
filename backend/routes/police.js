const express = require('express');
const router = express.Router();

// @route   GET /api/police/stations
// @desc    Get nearby police stations
// @access  Private
router.get('/stations', (req, res) => {
  res.json({
    success: true,
    message: 'Police stations endpoint - Coming soon!',
    data: [
      {
        id: 'station-1',
        name: 'Srirangam Police Station',
        address: 'Srirangam, Trichy, Tamil Nadu',
        phone: '+91-431-2464100'
      }
    ]
  });
});

module.exports = router;
