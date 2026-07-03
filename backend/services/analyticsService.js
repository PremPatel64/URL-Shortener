const Click = require('../models/clickModel');
const Url = require('../models/urlModel');
const { ForbiddenError, NotFoundError } = require('../utils/customErrors');
const mongoose = require('mongoose');

/**
 * Retrieves aggregate analytics for a single shortened URL
 * @param {string} urlId - MongoDB URL ID
 * @param {string} userId - Current user ID (for authorization)
 * @returns {Promise<object>} - Aggregated URL stats
 */
const getUrlAnalytics = async (urlId, userId) => {
  const url = await Url.findById(urlId);
  if (!url) {
    throw new NotFoundError('URL record not found.');
  }

  // Enforce ownership
  if (url.createdBy.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to view analytics for this URL.');
  }

  const objUrlId = new mongoose.Types.ObjectId(urlId);

  // Time milestones
  const now = new Date();
  const startOfToday = new Date(now.setHours(0, 0, 0, 0));
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Execute parallel aggregation operations to optimize performance
  const [
    totalClicks,
    timeStats,
    browserStats,
    osStats,
    deviceStats,
    countryStats
  ] = await Promise.all([
    // 1. Total Clicks
    Click.countDocuments({ urlId: objUrlId }),

    // 2. Click counts categorized by time ranges (Today, Weekly, Monthly)
    Click.aggregate([
      { $match: { urlId: objUrlId } },
      {
        $group: {
          _id: null,
          today: {
            $sum: { $cond: [{ $gte: ['$clickedAt', startOfToday] }, 1, 0] }
          },
          weekly: {
            $sum: { $cond: [{ $gte: ['$clickedAt', sevenDaysAgo] }, 1, 0] }
          },
          monthly: {
            $sum: { $cond: [{ $gte: ['$clickedAt', thirtyDaysAgo] }, 1, 0] }
          }
        }
      }
    ]),

    // 3. Browser Distribution
    Click.aggregate([
      { $match: { urlId: objUrlId } },
      { $group: { _id: '$browser', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),

    // 4. Operating System Distribution
    Click.aggregate([
      { $match: { urlId: objUrlId } },
      { $group: { _id: '$os', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),

    // 5. Device Type Distribution
    Click.aggregate([
      { $match: { urlId: objUrlId } },
      { $group: { _id: '$device', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),

    // 6. Country Distribution
    Click.aggregate([
      { $match: { urlId: objUrlId } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
  ]);

  return {
    totalClicks,
    todayClicks: timeStats[0]?.today || 0,
    weeklyClicks: timeStats[0]?.weekly || 0,
    monthlyClicks: timeStats[0]?.monthly || 0,
    distributions: {
      browsers: browserStats,
      operatingSystems: osStats,
      devices: deviceStats,
      countries: countryStats
    }
  };
};

/**
 * Retrieves aggregate analytics for all URLs owned by a specific user (Dashboard Analytics)
 * @param {string} userId - MongoDB User ID
 * @returns {Promise<object>} - Comprehensive dashboard stats
 */
const getUserDashboardAnalytics = async (userId) => {
  const objUserId = new mongoose.Types.ObjectId(userId);

  // 1. Fetch all URL IDs belonging to the user
  const userUrls = await Url.find({ createdBy: objUserId }).select('_id clickCount');
  if (userUrls.length === 0) {
    return {
      totalUrls: 0,
      totalClicks: 0,
      todayClicks: 0,
      weeklyClicks: 0,
      monthlyClicks: 0,
      topUrls: [],
      distributions: { browsers: [], operatingSystems: [], devices: [], countries: [] }
    };
  }

  const urlIds = userUrls.map((u) => u._id);

  // Time boundaries
  const now = new Date();
  const startOfToday = new Date(now.setHours(0, 0, 0, 0));
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Execute aggregated pipeline across all user's URLs
  const [
    timeStats,
    topUrls,
    browserStats,
    osStats,
    deviceStats,
    countryStats
  ] = await Promise.all([
    // Time metrics
    Click.aggregate([
      { $match: { urlId: { $in: urlIds } } },
      {
        $group: {
          _id: null,
          today: {
            $sum: { $cond: [{ $gte: ['$clickedAt', startOfToday] }, 1, 0] }
          },
          weekly: {
            $sum: { $cond: [{ $gte: ['$clickedAt', sevenDaysAgo] }, 1, 0] }
          },
          monthly: {
            $sum: { $cond: [{ $gte: ['$clickedAt', thirtyDaysAgo] }, 1, 0] }
          }
        }
      }
    ]),

    // Top 10 Shortened URLs based on clickCount
    Url.find({ createdBy: objUserId })
      .sort({ clickCount: -1 })
      .limit(10)
      .select('originalUrl shortCode clickCount customAlias'),

    // Distributions
    Click.aggregate([
      { $match: { urlId: { $in: urlIds } } },
      { $group: { _id: '$browser', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Click.aggregate([
      { $match: { urlId: { $in: urlIds } } },
      { $group: { _id: '$os', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Click.aggregate([
      { $match: { urlId: { $in: urlIds } } },
      { $group: { _id: '$device', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Click.aggregate([
      { $match: { urlId: { $in: urlIds } } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
  ]);

  // Aggregate total clicks directly from URL click counts
  const totalClicks = userUrls.reduce((sum, url) => sum + url.clickCount, 0);

  return {
    totalUrls: userUrls.length,
    totalClicks,
    todayClicks: timeStats[0]?.today || 0,
    weeklyClicks: timeStats[0]?.weekly || 0,
    monthlyClicks: timeStats[0]?.monthly || 0,
    topUrls,
    distributions: {
      browsers: browserStats,
      operatingSystems: osStats,
      devices: deviceStats,
      countries: countryStats
    }
  };
};

/**
 * Fetches raw click events for a specific URL, verifying ownership
 * @param {string} urlId
 * @param {string} userId
 * @returns {Promise<Array>} - Array of raw Click documents
 */
const getUrlClicks = async (urlId, userId) => {
  const url = await Url.findById(urlId);
  if (!url) {
    throw new NotFoundError('URL record not found.');
  }

  // Enforce ownership
  if (url.createdBy.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to view analytics for this URL.');
  }

  // Fetch all clicks for the URL, sorted by timestamp descending
  return await Click.find({ urlId }).sort({ clickedAt: -1 });
};

module.exports = {
  getUrlAnalytics,
  getUserDashboardAnalytics,
  getUrlClicks
};
