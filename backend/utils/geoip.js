/**
 * Utility to extract user country from request headers.
 * Supports Cloudflare headers, mock headers for testing, and handles loopback addresses.
 * 
 * @param {object} req - Express request object
 * @returns {string} - Country name or country code
 */
const getCountry = (req) => {
  // 1. Cloudflare IP Geolocation header (Standard in production behind Cloudflare)
  const cfCountry = req.headers['cf-ipcountry'];
  if (cfCountry) {
    return cfCountry.toUpperCase();
  }

  // 2. Generic load balancer/CDN country headers
  const xCountry = req.headers['x-country-code'];
  if (xCountry) {
    return xCountry.toUpperCase();
  }

  // 3. Mock country header (Highly useful for QA testing and development)
  if (process.env.NODE_ENV === 'development' && req.headers['x-mock-country']) {
    return req.headers['x-mock-country'];
  }

  // 4. Fallback checking for localhost loopbacks
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  if (clientIp.includes('127.0.0.1') || clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
    return 'Localhost';
  }

  return 'Unknown';
};

/**
 * Extracts clean IP address, prioritizing proxy forwarding headers
 */
const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; first one is the client
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'Unknown';
};

module.exports = {
  getCountry,
  getClientIp
};
