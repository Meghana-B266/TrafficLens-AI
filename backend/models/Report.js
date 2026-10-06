const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Violation Details
  violationType: {
    type: String,
    required: [true, 'Violation type is required'],
    enum: ['no_helmet', 'wrong_side', 'signal_jump', 'overspeeding', 'drunk_driving', 'other'],
    default: 'no_helmet'
  },
  
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Location Information
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Location coordinates are required']
    },
    address: {
      type: String,
      required: [true, 'Address is required']
    },
    landmark: String
  },
  
  // Evidence
  photos: [{
    public_id: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Vehicle Information
  vehicleDetails: {
    numberPlate: {
      type: String,
      required: [true, 'Number plate is required'],
      uppercase: true,
      trim: true
    },
    vehicleType: {
      type: String,
      enum: ['motorcycle', 'car', 'truck', 'bus', 'auto', 'other'],
      default: 'motorcycle'
    },
    make: String,
    model: String,
    color: String
  },
  
  // Verification Status
  status: {
    type: String,
    enum: ['pending', 'under_review', 'verified', 'rejected', 'challan_issued'],
    default: 'pending'
  },
  
  // Police Station Assignment
  assignedPoliceStation: {
    stationId: String,
    stationName: String,
    stationAddress: String,
    contactNumber: String,
    assignedAt: Date,
    assignedOfficer: String
  },
  
  // Verification Details
  verification: {
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date,
    verificationNotes: String,
    isNumberPlateValid: Boolean,
    isPhotoAuthentic: Boolean,
    isLocationAccurate: Boolean
  },
  
  // Challan Information
  challan: {
    challanNumber: String,
    fineAmount: {
      type: Number,
      min: 0
    },
    issuedAt: Date,
    dueDate: Date,
    isPaid: {
      type: Boolean,
      default: false
    },
    paidAt: Date,
    paymentMethod: String
  },
  
  // Reward Information
  reward: {
    amount: {
      type: Number,
      min: 0,
      default: 0
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    paidAt: Date,
    transactionId: String
  },
  
  // Additional Metadata
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  isAnonymous: {
    type: Boolean,
    default: false
  },
  
  reportedAt: {
    type: Date,
    default: Date.now
  },
  
  // AI/ML Analysis Results
  aiAnalysis: {
    numberPlateConfidence: Number,
    violationConfidence: Number,
    imageQualityScore: Number,
    fraudRiskScore: Number,
    processedAt: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
reportSchema.index({ location: '2dsphere' });
reportSchema.index({ reporter: 1, createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ 'vehicleDetails.numberPlate': 1 });
reportSchema.index({ 'assignedPoliceStation.stationId': 1 });

// Calculate reward amount before saving
reportSchema.pre('save', function(next) {
  if (this.challan && this.challan.fineAmount && !this.reward.amount) {
    this.reward.amount = Math.round(this.challan.fineAmount * (process.env.REWARD_PERCENTAGE || 10) / 100);
  }
  next();
});

module.exports = mongoose.model('Report', reportSchema);
