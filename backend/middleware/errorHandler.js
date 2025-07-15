const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Default error
    let error = {
        message: err.message || 'Internal Server Error',
        statusCode: err.statusCode || 500
    };

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        error.message = Object.values(err.errors).map(val => val.message);
        error.statusCode = 400;
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        error.message = 'Duplicate field value entered';
        error.statusCode = 400;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error.message = 'Invalid token';
        error.statusCode = 401;
    }

    // File upload errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        error.message = 'File size too large';
        error.statusCode = 400;
    }

    // OpenAI API errors
    if (err.code === 'insufficient_quota') {
        error.message = 'OpenAI API quota exceeded';
        error.statusCode = 503;
    }

    // FFmpeg errors
    if (err.message && err.message.includes('ffmpeg')) {
        error.message = 'Video processing failed';
        error.statusCode = 422;
    }

    res.status(error.statusCode).json({
        success: false,
        error: {
            message: error.message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
};

module.exports = { errorHandler }; 