/**
 * Cloudinary Configuration — v2
 * Uses explicit config + base64 upload() method (more reliable than upload_stream on restricted accounts)
 */

const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Explicit config — more reliable than CLOUDINARY_URL auto-detection
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

// Memory storage — files buffered in RAM
const memoryStorage = multer.memoryStorage();

const uploadPost = multer({
  storage: memoryStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

const uploadAvatar = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

/**
 * Upload a buffer to Cloudinary using base64 data URI + upload()
 * @param {Buffer} buffer
 * @param {string} mimetype - e.g. 'image/jpeg'
 * @param {object} options  - folder, resource_type, transformation, etc.
 * @returns {Promise<object>} Cloudinary result with secure_url
 */
function uploadToCloudinary(buffer, mimetype, options = {}) {
  return new Promise((resolve, reject) => {
    const base64 = buffer.toString('base64');
    const dataUri = `data:${mimetype};base64,${base64}`;

    cloudinary.uploader.upload(dataUri, options, (error, result) => {
      if (error) {
        console.error('Cloudinary upload error:', JSON.stringify(error));
        return reject(error);
      }
      resolve(result);
    });
  });
}

module.exports = { cloudinary, uploadPost, uploadAvatar, uploadToCloudinary };
