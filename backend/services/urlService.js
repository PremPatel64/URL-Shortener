const { nanoid } = require('nanoid');
const Url = require('../models/urlModel');
const { ConflictError, NotFoundError, ForbiddenError } = require('../utils/customErrors');

/**
 * Generates a unique short code, checking for collisions in database
 * @returns {Promise<string>} - Unique 7-character alphanumeric code
 */
const generateUniqueShortCode = async () => {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    // Generate 7-character alphanumeric code
    const code = nanoid(7);
    const existingUrl = await Url.findOne({ shortCode: code });
    if (!existingUrl) {
      return code;
    }
    attempts++;
  }

  throw new Error('Server busy. Failed to generate a unique short code.');
};

/**
 * Creates a new shortened URL
 * @param {object} urlData - { originalUrl, customAlias, expiresAt, userId }
 * @returns {Promise<object>} - Created URL document
 */
const createShortUrl = async (urlData) => {
  const { originalUrl, customAlias, expiresAt, userId } = urlData;

  // 1. Duplicate URL Detection (Without Custom Alias)
  // If the same user has already shortened this URL without an alias, return the existing one
  if (!customAlias) {
    const existingUrl = await Url.findOne({
      originalUrl,
      createdBy: userId,
      customAlias: { $exists: false } // Check for lack of custom alias
    });
    
    if (existingUrl) {
      // Check if it has expired; if not, return it
      if (!existingUrl.expiresAt || existingUrl.expiresAt > new Date()) {
        return existingUrl;
      }
      // If it is expired, we delete it so we can create a fresh one
      await Url.deleteOne({ _id: existingUrl._id });
    }
  }

  // 2. Custom Alias Handling & Validation
  let finalShortCode;
  if (customAlias) {
    const formattedAlias = customAlias.trim().toLowerCase();
    // Check if alias is already used as a shortCode or customAlias
    const aliasInUse = await Url.findOne({
      $or: [{ shortCode: formattedAlias }, { customAlias: formattedAlias }]
    });

    if (aliasInUse) {
      throw new ConflictError('Custom alias is already in use. Please try another one.');
    }
    finalShortCode = formattedAlias;
  } else {
    // Generate random 7-character code
    finalShortCode = await generateUniqueShortCode();
  }

  // 3. Save to database
  const newUrl = await Url.create({
    originalUrl,
    shortCode: finalShortCode,
    customAlias: customAlias ? customAlias.trim().toLowerCase() : undefined,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    createdBy: userId
  });

  return newUrl;
};

/**
 * Resolves a short code/alias and updates the click count (Redirect Engine)
 * @param {string} code - The short code or custom alias
 * @returns {Promise<string>} - The original URL to redirect to
 */
const resolveAndIncrementUrl = async (code) => {
  const cleanCode = code.trim();
  
  // Find URL by shortCode (case-sensitive) or customAlias (case-insensitive/lowercased)
  const url = await Url.findOne({
    $or: [{ shortCode: cleanCode }, { customAlias: cleanCode.toLowerCase() }]
  });

  // Handle URL not found or expired
  if (!url) {
    throw new NotFoundError('Short URL not found or has expired.');
  }

  if (url.expiresAt && url.expiresAt <= new Date()) {
    throw new NotFoundError('Short URL has expired.');
  }

  // Atomically increment click count
  url.clickCount += 1;
  await url.save();

  return url;
};

/**
 * Retrieves URL details by its MongoDB ID, verifying ownership
 * @param {string} urlId
 * @param {string} userId
 * @returns {Promise<object>} - URL document
 */
const getUrlById = async (urlId, userId) => {
  const url = await Url.findById(urlId);

  if (!url) {
    throw new NotFoundError('URL record not found.');
  }

  // Check if it belongs to the logged-in user
  if (url.createdBy.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to access this URL record.');
  }

  return url;
};

/**
 * Updates a URL's custom alias
 * @param {string} urlId
 * @param {string} customAlias
 * @param {string} userId
 * @returns {Promise<object>} - Updated URL document
 */
const updateCustomAlias = async (urlId, customAlias, userId) => {
  const formattedAlias = customAlias.trim().toLowerCase();
  const url = await Url.findById(urlId);

  if (!url) {
    throw new NotFoundError('URL record not found.');
  }

  // Enforce ownership
  if (url.createdBy.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to modify this URL record.');
  }

  // If alias hasn't changed, just return the document
  if (url.customAlias === formattedAlias) {
    return url;
  }

  // Check if the new alias is already in use
  const aliasInUse = await Url.findOne({
    $or: [{ shortCode: formattedAlias }, { customAlias: formattedAlias }]
  });

  if (aliasInUse) {
    throw new ConflictError('Custom alias is already in use. Please try another one.');
  }

  url.customAlias = formattedAlias;
  // If the shortCode was also the old alias, let's update shortCode to match the new alias as well
  url.shortCode = formattedAlias; 
  await url.save();

  return url;
};

/**
 * Deletes a shortened URL record
 * @param {string} urlId
 * @param {string} userId
 */
const deleteUrl = async (urlId, userId) => {
  const url = await Url.findById(urlId);

  if (!url) {
    throw new NotFoundError('URL record not found.');
  }

  // Enforce ownership
  if (url.createdBy.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to delete this URL record.');
  }

  await Url.deleteOne({ _id: urlId });
};

const toggleFavoriteUrl = async (urlId, userId) => {
  const url = await Url.findById(urlId);

  if (!url) {
    throw new NotFoundError('URL record not found.');
  }

  // Enforce ownership
  if (url.createdBy.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to modify this URL record.');
  }

  url.isFavorite = !url.isFavorite;
  await url.save();

  return url;
};

module.exports = {
  createShortUrl,
  resolveAndIncrementUrl,
  getUrlById,
  updateCustomAlias,
  deleteUrl,
  toggleFavoriteUrl
};
