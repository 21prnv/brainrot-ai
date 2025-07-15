const Joi = require('joi');

// Validate video upload
const validateVideoUpload = (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            error: {
                message: 'No video file provided'
            }
        });
    }

    const schema = Joi.object({
        prompt: Joi.string().min(10).max(500).optional(),
        voice: Joi.string().optional(),
        style: Joi.string().valid('casual', 'professional', 'energetic', 'dramatic').optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                message: error.details[0].message
            }
        });
    }

    next();
};

// Validate script generation request
const validateScriptGeneration = (req, res, next) => {
    const schema = Joi.object({
        prompt: Joi.string().min(10).max(500).optional(),
        style: Joi.string().valid('casual', 'professional', 'energetic', 'dramatic').optional(),
        tone: Joi.string().valid('funny', 'serious', 'informative', 'promotional').optional(),
        duration: Joi.number().min(10).max(60).optional() // Target duration in seconds
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                message: error.details[0].message
            }
        });
    }

    next();
};

// Validate video ID parameter
const validateVideoId = (req, res, next) => {
    const schema = Joi.object({
        videoId: Joi.string().uuid().required()
    });

    const { error } = schema.validate(req.params);
    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                message: 'Invalid video ID format'
            }
        });
    }

    next();
};

// Validate script update
const validateScriptUpdate = (req, res, next) => {
    const schema = Joi.object({
        script: Joi.string().min(10).max(2000).required(),
        voice: Joi.string().optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                message: error.details[0].message
            }
        });
    }

    next();
};

module.exports = {
    validateVideoUpload,
    validateScriptGeneration,
    validateVideoId,
    validateScriptUpdate
}; 