const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema(
  {
    originalUrl: {
      type: String,
      required: [true, 'Please provide the original URL'],
      trim: true
    },
    shortCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true // Ensure fast lookup on shortCode redirection
    },
    customAlias: {
      type: String,
      unique: true,
      sparse: true, // Crucial: sparse index allows null/undefined values to co-exist without unique constraint violations
      trim: true,
      lowercase: true,
      minlength: [3, 'Custom alias must be at least 3 characters'],
      maxlength: [30, 'Custom alias cannot exceed 30 characters']
    },
    clickCount: {
      type: Number,
      default: 0
    },
    expiresAt: {
      type: Date
    },
    isFavorite: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A URL must belong to a user']
    }
  },
  {
    timestamps: true
  }
);

// Compound index for finding URLs created by a specific user sorted by creation date
urlSchema.index({ createdBy: 1, createdAt: -1 });

const Url = mongoose.model('Url', urlSchema);

module.exports = Url;
