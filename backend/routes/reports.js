const express = require('express');
const router = express.Router();

const Report = require('../models/Report');
const { protect, adminOnly } = require('../middleware/authMiddleware');


// =====================================================
// CREATE REPORT
// POST /api/reports
// ACCESS: CITIZEN
// =====================================================

router.post('/', protect, async (req, res) => {

    try {

        const {
            violationType,
            description,
            location,
            photos,
            vehicleDetails,
            assignedPoliceStation,
            priority,
            isAnonymous,
            aiAnalysis
        } = req.body;


        // =================================================
        // VALIDATION
        // =================================================

        if (!violationType) {

            return res.status(400).json({
                success: false,
                message: 'Violation type is required'
            });

        }


        if (
            !location ||
            !location.coordinates ||
            !location.address
        ) {

            return res.status(400).json({
                success: false,
                message: 'Location information is required'
            });

        }


        // Validate coordinates
        if (
            !Array.isArray(location.coordinates) ||
            location.coordinates.length !== 2 ||
            !Number.isFinite(Number(location.coordinates[0])) ||
            !Number.isFinite(Number(location.coordinates[1]))
        ) {

            return res.status(400).json({
                success: false,
                message: 'Valid GPS coordinates are required'
            });

        }


        if (
            !vehicleDetails ||
            !vehicleDetails.numberPlate
        ) {

            return res.status(400).json({
                success: false,
                message: 'Vehicle number plate is required'
            });

        }


        // =================================================
        // CREATE REPORT
        // =================================================

        const report = await Report.create({

            reporter: req.user._id,

            violationType,

            description,

            location: {

                type: 'Point',

                // GeoJSON:
                // [longitude, latitude]

                coordinates: [
                    Number(location.coordinates[0]),
                    Number(location.coordinates[1])
                ],

                address:
                    location.address,

                landmark:
                    location.landmark || ''

            },

            photos:
                photos || [],

            vehicleDetails: {

                numberPlate:
                    vehicleDetails.numberPlate,

                vehicleType:
                    vehicleDetails.vehicleType ||
                    'motorcycle',

                make:
                    vehicleDetails.make || '',

                model:
                    vehicleDetails.model || '',

                color:
                    vehicleDetails.color || ''

            },

            assignedPoliceStation:
                assignedPoliceStation || {},

            priority:
                priority || 'medium',

            isAnonymous:
                isAnonymous || false,

            aiAnalysis:
                aiAnalysis || {},

            status:
                'pending'

        });


        console.log(
            'Report saved to MongoDB:',
            report._id
        );


        // =================================================
        // RESPONSE
        // =================================================

        res.status(201).json({

            success: true,

            message:
                'Report created successfully',

            data:
                report

        });


    } catch (error) {

        console.error(
            'Create report error:',
            error
        );


        res.status(500).json({

            success: false,

            message:
                'Failed to create report',

            error:
                error.message

        });

    }

});


// =====================================================
// GET ALL REPORTS
// GET /api/reports
// ACCESS: ADMIN
// =====================================================

router.get(
    '/',
    protect,
    adminOnly,
    async (req, res) => {

        try {

            const reports =
                await Report.find()
                    .populate(
                        'reporter',
                        'name email phone'
                    )
                    .sort({
                        createdAt: -1
                    });


            res.json({

                success: true,

                count:
                    reports.length,

                data:
                    reports

            });


        } catch (error) {

            console.error(
                'Get reports error:',
                error
            );


            res.status(500).json({

                success: false,

                message:
                    'Failed to retrieve reports'

            });

        }

    }
);


// =====================================================
// GET SINGLE REPORT
// GET /api/reports/:id
// ACCESS: ADMIN
// =====================================================

router.get(
    '/:id',
    protect,
    adminOnly,
    async (req, res) => {

        try {

            const report =
                await Report.findById(
                    req.params.id
                )
                .populate(
                    'reporter',
                    'name email phone'
                );


            if (!report) {

                return res.status(404).json({

                    success: false,

                    message:
                        'Report not found'

                });

            }


            res.json({

                success: true,

                data:
                    report

            });


        } catch (error) {

            console.error(
                'Get report error:',
                error
            );


            res.status(500).json({

                success: false,

                message:
                    'Failed to retrieve report'

            });

        }

    }
);
// =====================================================
// GET MY REPORTS
// GET /api/reports/my
// ACCESS: LOGGED-IN CITIZEN
// =====================================================

router.get(
    '/my',
    protect,
    async (req, res) => {

        try {

            const reports = await Report.find({
                reporter: req.user._id
            }).sort({
                createdAt: -1
            });

            res.json({
                success: true,
                count: reports.length,
                data: reports
            });

        } catch (error) {

            console.error(
                'Get my reports error:',
                error
            );

            res.status(500).json({
                success: false,
                message: 'Failed to retrieve your reports',
                error: error.message
            });

        }

    }
);


// =====================================================
// VERIFY REPORT
// PUT /api/reports/:id/verify
// ACCESS: ADMIN
// =====================================================

router.put(
    '/:id/verify',
    protect,
    adminOnly,
    async (req, res) => {

        try {

            const {
                verificationNotes
            } = req.body;


            const report =
                await Report.findById(
                    req.params.id
                );


            // Report not found
            if (!report) {

                return res.status(404).json({

                    success: false,

                    message:
                        'Report not found'

                });

            }


            // =============================================
            // UPDATE VERIFICATION
            // =============================================

            report.status =
                'verified';


            report.verification = {

                verifiedBy:
                    req.user._id,

                verifiedAt:
                    new Date(),

                verificationNotes:
                    verificationNotes ||
                    'Report verified by administrator.',

                isNumberPlateValid:
                    true,

                isPhotoAuthentic:
                    true,

                isLocationAccurate:
                    true

            };


            await report.save();


            console.log(
                'Report verified:',
                report._id
            );


            res.json({

                success: true,

                message:
                    'Report verified successfully',

                data:
                    report

            });


        } catch (error) {

            console.error(
                'Verify report error:',
                error
            );


            res.status(500).json({

                success: false,

                message:
                    'Failed to verify report',

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// REJECT REPORT
// PUT /api/reports/:id/reject
// ACCESS: ADMIN
// =====================================================

router.put(
    '/:id/reject',
    protect,
    adminOnly,
    async (req, res) => {

        try {

            const {
                verificationNotes
            } = req.body;


            const report =
                await Report.findById(
                    req.params.id
                );


            // Report not found
            if (!report) {

                return res.status(404).json({

                    success: false,

                    message:
                        'Report not found'

                });

            }


            // =============================================
            // UPDATE STATUS
            // =============================================

            report.status =
                'rejected';


            report.verification = {

                verifiedBy:
                    req.user._id,

                verifiedAt:
                    new Date(),

                verificationNotes:
                    verificationNotes ||
                    'Report rejected by administrator.',

                isNumberPlateValid:
                    false,

                isPhotoAuthentic:
                    false,

                isLocationAccurate:
                    false

            };


            await report.save();


            console.log(
                'Report rejected:',
                report._id
            );


            res.json({

                success: true,

                message:
                    'Report rejected successfully',

                data:
                    report

            });


        } catch (error) {

            console.error(
                'Reject report error:',
                error
            );


            res.status(500).json({

                success: false,

                message:
                    'Failed to reject report',

                error:
                    error.message

            });

        }

    }
);


module.exports = router;