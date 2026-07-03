const analyticsService = require('../services/analyticsService');
const catchAsync = require('../utils/catchAsync');

/**
 * @desc    Get analytics for a specific URL ID
 * @route   GET /api/analytics/:id
 * @access  Private
 */
const getUrlStats = catchAsync(async (req, res, next) => {
  const urlId = req.params.id;
  const userId = req.user._id;

  const stats = await analyticsService.getUrlAnalytics(urlId, userId);

  res.status(200).json({
    success: true,
    data: {
      analytics: stats
    }
  });
});

/**
 * @desc    Get aggregated dashboard analytics for the current user
 * @route   GET /api/analytics
 * @access  Private
 */
const getDashboardStats = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const stats = await analyticsService.getUserDashboardAnalytics(userId);

  res.status(200).json({
    success: true,
    data: {
      dashboard: stats
    }
  });
});

/**
 * @desc    Export click analytics for a specific URL to CSV
 * @route   GET /api/analytics/:id/csv
 * @access  Private
 */
const exportCsv = catchAsync(async (req, res, next) => {
  const urlId = req.params.id;
  const userId = req.user._id;

  // Retrieve raw click logs
  const clicks = await analyticsService.getUrlClicks(urlId, userId);

  // Generate CSV content
  const headers = ['Click ID', 'IP Address', 'Country', 'Browser', 'Operating System', 'Device', 'Clicked At'];
  const rows = clicks.map((click) => {
    return [
      click._id.toString(),
      `"${click.ip}"`,
      `"${click.country}"`,
      `"${click.browser}"`,
      `"${click.os}"`,
      `"${click.device}"`,
      `"${click.clickedAt.toISOString()}"`
    ].join(',');
  });
  
  const csvContent = [headers.join(','), ...rows].join('\n');

  // Set response headers to trigger file download in browser
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="url-analytics-${urlId}.csv"`);
  res.status(200).send(csvContent);
});

module.exports = {
  getUrlStats,
  getDashboardStats,
  exportCsv
};
