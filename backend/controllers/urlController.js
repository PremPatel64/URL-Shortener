const urlService = require('../services/urlService');
const { generateQRCode } = require('../utils/qrcode');
const catchAsync = require('../utils/catchAsync');
const Url = require('../models/urlModel');
const Click = require('../models/clickModel');
const { parseUserAgent } = require('../utils/userAgentParser');
const { getCountry, getClientIp } = require('../utils/geoip');

/**
 * Helper to construct full short URL and inject QR Code
 */
const formatUrlResponse = async (urlDoc, req) => {
  const domain = `${req.protocol}://${req.get('host')}`;
  const shortUrl = `${domain}/${urlDoc.shortCode}`;
  
  // Generate Base64 QR Code string
  const qrCode = await generateQRCode(shortUrl);

  return {
    _id: urlDoc._id,
    originalUrl: urlDoc.originalUrl,
    shortCode: urlDoc.shortCode,
    customAlias: urlDoc.customAlias,
    clickCount: urlDoc.clickCount,
    expiresAt: urlDoc.expiresAt,
    isFavorite: urlDoc.isFavorite,
    createdAt: urlDoc.createdAt,
    updatedAt: urlDoc.updatedAt,
    shortUrl,
    qrCode
  };
};

/**
 * @desc    Create a short URL
 * @route   POST /api/url
 * @access  Private
 */
const create = catchAsync(async (req, res, next) => {
  const { originalUrl, customAlias, expiresAt } = req.body;
  const userId = req.user._id;

  const url = await urlService.createShortUrl({
    originalUrl,
    customAlias,
    expiresAt,
    userId
  });

  const data = await formatUrlResponse(url, req);

  res.status(201).json({
    success: true,
    message: 'Short URL created successfully.',
    data
  });
});

/**
 * @desc    Get all URLs created by current user
 * @route   GET /api/url
 * @access  Private
 */
const getAllByUser = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { search, date, isFavorite, status, sort, page = 1, limit = 10 } = req.query;

  // Build dynamic database query object
  const queryObj = { createdBy: userId };

  // 1. Text Search (Matches original URL, shortCode, or customAlias)
  if (search) {
    queryObj.$or = [
      { originalUrl: { $regex: search, $options: 'i' } },
      { shortCode: { $regex: search, $options: 'i' } },
      { customAlias: { $regex: search, $options: 'i' } }
    ];
  }

  // 2. Date Search (Filters URLs created on the specific calendar day)
  if (date) {
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      // Calculate start and end bounds of the calendar day in UTC
      const startOfDay = new Date(parsedDate.setUTCHours(0, 0, 0, 0));
      const endOfDay = new Date(parsedDate.setUTCHours(23, 59, 59, 999));
      queryObj.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }
  }

  // 3. Filtering by Favorite status
  if (isFavorite !== undefined) {
    queryObj.isFavorite = isFavorite === 'true';
  }

  // 4. Filtering by Expiration Status (Active vs Expired)
  if (status) {
    if (status === 'active') {
      queryObj.$and = [
        {
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
          ]
        }
      ];
    } else if (status === 'expired') {
      queryObj.expiresAt = { $lte: new Date() };
    }
  }

  // 5. Sorting Options
  let sortBy = { createdAt: -1 }; // Default: Newest first
  if (sort) {
    if (sort === 'oldest') {
      sortBy = { createdAt: 1 };
    } else if (sort === 'most-clicked') {
      sortBy = { clickCount: -1 };
    } else if (sort === 'least-clicked') {
      sortBy = { clickCount: 1 };
    } else if (sort === 'alphabetical') {
      sortBy = { originalUrl: 1 };
    }
  }

  // 6. Pagination Calculations
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
  const skip = (pageNum - 1) * limitNum;

  // Execute queries
  const totalUrls = await Url.countDocuments(queryObj);
  const urls = await Url.find(queryObj)
    .sort(sortBy)
    .skip(skip)
    .limit(limitNum);

  // Map and attach full short URL and QR codes for each
  const formattedUrls = await Promise.all(
    urls.map((url) => formatUrlResponse(url, req))
  );

  const totalPages = Math.ceil(totalUrls / limitNum);

  res.status(200).json({
    success: true,
    results: formattedUrls.length,
    pagination: {
      totalItems: totalUrls,
      currentPage: pageNum,
      limit: limitNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    },
    data: {
      urls: formattedUrls
    }
  });
});

/**
 * @desc    Get single URL details by ID
 * @route   GET /api/url/:id
 * @access  Private
 */
const getById = catchAsync(async (req, res, next) => {
  const urlId = req.params.id;
  const userId = req.user._id;

  const url = await urlService.getUrlById(urlId, userId);
  const formattedUrl = await formatUrlResponse(url, req);

  res.status(200).json({
    success: true,
    data: {
      url: formattedUrl
    }
  });
});

/**
 * @desc    Update a URL's custom alias
 * @route   PUT /api/url/:id
 * @access  Private
 */
const updateAlias = catchAsync(async (req, res, next) => {
  const urlId = req.params.id;
  const { customAlias } = req.body;
  const userId = req.user._id;

  const updatedUrl = await urlService.updateCustomAlias(urlId, customAlias, userId);
  const formattedUrl = await formatUrlResponse(updatedUrl, req);

  res.status(200).json({
    success: true,
    message: 'Custom alias updated successfully.',
    data: {
      url: formattedUrl
    }
  });
});

/**
 * @desc    Delete a shortened URL
 * @route   DELETE /api/url/:id
 * @access  Private
 */
const deleteShortUrl = catchAsync(async (req, res, next) => {
  const urlId = req.params.id;
  const userId = req.user._id;

  await urlService.deleteUrl(urlId, userId);

  res.status(200).json({
    success: true,
    message: 'Short URL deleted successfully.'
  });
});

/**
 * Helper to log click events asynchronously in the background.
 * Avoids blocking user redirection.
 */
const logClick = (urlId, req) => {
  const ip = getClientIp(req);
  const country = getCountry(req);
  const uaInfo = parseUserAgent(req.headers['user-agent']);

  Click.create({
    urlId,
    ip,
    country,
    browser: uaInfo.browser,
    os: uaInfo.os,
    device: uaInfo.device
  }).catch((err) => {
    console.error('[Analytics Error] Failed to log click event:', err.message);
  });
};

/**
 * @desc    Redirect short code to original URL
 * @route   GET /:shortCode
 * @access  Public
 */
const redirectUrl = catchAsync(async (req, res, next) => {
  const { shortCode } = req.params;
  
  // Resolve code and atomically increment clicks
  const urlDoc = await Url.findOne({
    $or: [{ shortCode: shortCode }, { customAlias: shortCode.toLowerCase() }]
  });

  if (!urlDoc) {
    return res.status(404).send('<h1>URL Not Found or Expired</h1><p>The short link is invalid or has reached its expiration date.</p>');
  }

  if (urlDoc.expiresAt && urlDoc.expiresAt <= new Date()) {
    return res.status(404).send('<h1>URL Expired</h1><p>This short link has expired.</p>');
  }

  // Increment clicks in DB
  urlDoc.clickCount += 1;
  await urlDoc.save();

  // Log click event in the background (Non-blocking write)
  logClick(urlDoc._id, req);

  // 302 Temporary Redirect: ensures browser fetches redirect dynamically every time, enabling analytics tracking.
  res.status(302).redirect(urlDoc.originalUrl);
});

/**
 * @desc    Toggle favorite status of a shortened URL
 * @route   PATCH /api/url/:id/favorite
 * @access  Private
 */
const toggleFavorite = catchAsync(async (req, res, next) => {
  const urlId = req.params.id;
  const userId = req.user._id;

  const updatedUrl = await urlService.toggleFavoriteUrl(urlId, userId);
  const formattedUrl = await formatUrlResponse(updatedUrl, req);

  res.status(200).json({
    success: true,
    message: `URL marked as ${updatedUrl.isFavorite ? 'favorite' : 'not favorite'}.`,
    data: {
      url: formattedUrl
    }
  });
});

module.exports = {
  create,
  getAllByUser,
  getById,
  updateAlias,
  deleteShortUrl,
  redirectUrl,
  toggleFavorite
};
