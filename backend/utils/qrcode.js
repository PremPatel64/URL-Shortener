const QRCode = require('qrcode');

/**
 * Generates a Base64 QR Code image string for a given text (the short URL)
 * @param {string} text - The short URL string to convert to QR Code
 * @returns {Promise<string>} - Base64 Data URL string
 */
const generateQRCode = async (text) => {
  try {
    // Generate QR code with standard options
    const qrCodeDataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H', // High error correction (best for physical scanning)
      type: 'image/png',
      margin: 2,
      width: 300,
      color: {
        dark: '#0f172a',  // Dark Slate / text-slate-900 color for premium aesthetics
        light: '#ffffff' // White background
      }
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('[QR Code Utility Error] Failed to generate QR Code:', error.message);
    throw new Error('Could not generate QR Code for the short URL.');
  }
};

module.exports = { generateQRCode };
