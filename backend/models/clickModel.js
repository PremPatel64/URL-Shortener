const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema(
  {
    urlId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Url',
      required: [true, 'A click must be associated with a shortened URL'],
      index: true // Index for fast lookup when querying analytics for a specific URL
    },
    ip: {
      type: String,
      default: 'Unknown'
    },
    browser: {
      type: String,
      default: 'Unknown'
    },
    os: {
      type: String,
      default: 'Unknown'
    },
    device: {
      type: String,
      default: 'Desktop' // Desktop, Mobile, Tablet, or Bot
    },
    country: {
      type: String,
      default: 'Unknown'
    },
    clickedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    // We don't need timestamps (updatedAt) for raw event logging
    timestamps: false
  }
);

// Compound index for time-series range queries on specific URLs (e.g. today, weekly, monthly clicks)
clickSchema.index({ urlId: 1, clickedAt: -1 });

const Click = mongoose.model('Click', clickSchema);

module.exports = Click;
