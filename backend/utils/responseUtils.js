/**
 * Standard success response
 * @param {object} res - Express response object
 * @param {object} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 */
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    });
};

/**
 * Standard error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {object} error - Error details
 */
const errorResponse = (res, message = 'An error occurred', statusCode = 500, error = null) => {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString()
    };

    if (error && process.env.NODE_ENV === 'development') {
        response.error = error;
    }

    return res.status(statusCode).json(response);
};

/**
 * Validation error response
 * @param {object} res - Express response object
 * @param {object} errors - Validation errors
 * @param {string} message - Error message
 */
const validationErrorResponse = (res, errors, message = 'Validation failed') => {
    return res.status(400).json({
        success: false,
        message,
        errors,
        timestamp: new Date().toISOString()
    });
};

/**
 * Not found response
 * @param {object} res - Express response object
 * @param {string} resource - Resource name
 */
const notFoundResponse = (res, resource = 'Resource') => {
    return res.status(404).json({
        success: false,
        message: `${resource} not found`,
        timestamp: new Date().toISOString()
    });
};

/**
 * Processing response (for long-running operations)
 * @param {object} res - Express response object
 * @param {string} message - Processing message
 * @param {object} data - Additional data
 */
const processingResponse = (res, message = 'Processing started', data = null) => {
    return res.status(202).json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    });
};

/**
 * Rate limit exceeded response
 * @param {object} res - Express response object
 * @param {string} message - Rate limit message
 */
const rateLimitResponse = (res, message = 'Rate limit exceeded') => {
    return res.status(429).json({
        success: false,
        message,
        timestamp: new Date().toISOString()
    });
};

/**
 * Unauthorized response
 * @param {object} res - Express response object
 * @param {string} message - Unauthorized message
 */
const unauthorizedResponse = (res, message = 'Unauthorized') => {
    return res.status(401).json({
        success: false,
        message,
        timestamp: new Date().toISOString()
    });
};

/**
 * Forbidden response
 * @param {object} res - Express response object
 * @param {string} message - Forbidden message
 */
const forbiddenResponse = (res, message = 'Forbidden') => {
    return res.status(403).json({
        success: false,
        message,
        timestamp: new Date().toISOString()
    });
};

/**
 * Paginated response
 * @param {object} res - Express response object
 * @param {object} data - Response data
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @param {string} message - Success message
 */
const paginatedResponse = (res, data, page, limit, total, message = 'Success') => {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return res.status(200).json({
        success: true,
        message,
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext,
            hasPrev
        },
        timestamp: new Date().toISOString()
    });
};

/**
 * File download response
 * @param {object} res - Express response object
 * @param {string} filePath - File path
 * @param {string} fileName - File name for download
 * @param {string} contentType - Content type
 */
const fileDownloadResponse = (res, filePath, fileName, contentType = 'application/octet-stream') => {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.download(filePath, fileName);
};

/**
 * Streaming response
 * @param {object} res - Express response object
 * @param {ReadStream} stream - File stream
 * @param {string} contentType - Content type
 */
const streamResponse = (res, stream, contentType = 'application/octet-stream') => {
    res.setHeader('Content-Type', contentType);
    stream.pipe(res);
};

module.exports = {
    successResponse,
    errorResponse,
    validationErrorResponse,
    notFoundResponse,
    processingResponse,
    rateLimitResponse,
    unauthorizedResponse,
    forbiddenResponse,
    paginatedResponse,
    fileDownloadResponse,
    streamResponse
}; 