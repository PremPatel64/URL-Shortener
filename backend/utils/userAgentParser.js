/**
 * Lightweight, zero-dependency parser for User-Agent strings.
 * Extracts Operating System, Browser, and Device Type.
 * 
 * @param {string} uaStringStr - Raw user agent header value
 * @returns {object} - { os, browser, device }
 */
const parseUserAgent = (uaStringStr) => {
  if (!uaStringStr) {
    return { os: 'Unknown', browser: 'Unknown', device: 'Desktop' };
  }

  const ua = uaStringStr.trim();
  let os = 'Unknown';
  let browser = 'Unknown';
  let device = 'Desktop';

  // 1. Operating System Detection
  if (/windows/i.test(ua)) {
    os = 'Windows';
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'macOS';
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = 'iOS';
  } else if (/android/i.test(ua)) {
    os = 'Android';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  }

  // 2. Device Type Detection
  if (/googlebot|bingbot|yandex|baidu|crawler|spider/i.test(ua)) {
    device = 'Bot';
  } else if (/ipad/i.test(ua)) {
    device = 'Tablet';
  } else if (/mobi|iphone|android/i.test(ua)) {
    device = 'Mobile';
  }

  // 3. Browser Detection
  if (/edg/i.test(ua)) {
    browser = 'Edge';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Firefox';
  } else if (/opr\/|opera/i.test(ua)) {
    browser = 'Opera';
  } else if (/chrome|crios/i.test(ua)) {
    browser = 'Chrome';
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    browser = 'Safari';
  }

  return { os, browser, device };
};

module.exports = { parseUserAgent };
