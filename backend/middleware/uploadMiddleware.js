const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

// Ensure upload directory exists
const ensureDirectoryExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// Create storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        ensureDirectoryExists(config.upload.uploadDir);
        cb(null, config.upload.uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// File filter for video files
const fileFilter = (req, file, cb) => {
    if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only video files are allowed'), false);
    }
};

// Create multer instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: config.upload.maxSize
    },
    fileFilter: fileFilter
});

// Video upload middleware
const uploadVideo = upload.single('video');

// Error handling wrapper
const handleUploadError = (req, res, next) => {
    uploadVideo(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'File size too large. Maximum size is 100MB'
                    }
                });
            }
            if (err.message === 'Only video files are allowed') {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Only video files are allowed'
                    }
                });
            }
            return res.status(400).json({
                success: false,
                error: {
                    message: err.message
                }
            });
        }
        next();
    });
};

module.exports = { 
    uploadVideo: handleUploadError,
    ensureDirectoryExists 
}; 