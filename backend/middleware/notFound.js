const notFound = (req, res, next) => {
    const error = new Error(`Route ${req.originalUrl} not found`);
    res.status(404).json({
        success: false,
        error: {
            message: error.message
        }
    });
};

module.exports = { notFound }; 