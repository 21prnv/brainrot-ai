const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const subtitleService = require('../services/subtitleService');
const ffmpegService = require('../services/ffmpegService');
const videoModel = require('../models/videoModel');
const config = require('../config/config');
const { successResponse, errorResponse, notFoundResponse } = require('../utils/responseUtils');

/**
 * Generate subtitles from script text
 */
const generateSubtitles = async (req, res) => {
    try {
        const { script, videoDuration, format = 'srt', options = {} } = req.body;

        if (!script || !videoDuration) {
            return errorResponse(res, 'Script and video duration are required', 400);
        }

        const videoId = uuidv4();
        const outputDir = path.join(config.upload.processedDir, videoId);

        const result = await subtitleService.processSubtitles(
            script,
            videoDuration,
            outputDir,
            videoId,
            { format, ...options }
        );

        // Store subtitle info (you might want to create a subtitle model)
        const subtitleData = {
            id: videoId,
            script,
            videoDuration,
            format,
            subtitlePath: result.subtitlePath,
            createdAt: new Date().toISOString()
        };

        successResponse(res, {
            subtitleId: videoId,
            subtitlePath: result.subtitlePath,
            format: result.format,
            content: result.subtitleContent
        }, 'Subtitles generated successfully', 201);

    } catch (error) {
        console.error('Generate subtitles error:', error);
        errorResponse(res, 'Failed to generate subtitles', 500, error);
    }
};

/**
 * Add subtitles to existing video
 */
const addSubtitlesToVideo = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { 
            subtitleType = 'hard', 
            styling = {},
            script,
            format = 'srt'
        } = req.body;

        // Find video record
        const video = videoModel.findById(videoId);
        if (!video) {
            return notFoundResponse(res, 'Video');
        }

        if (!fs.existsSync(video.filePath)) {
            return errorResponse(res, 'Video file not found', 404);
        }

        // Get video duration if not available
        let videoDuration = video.duration;
        if (!videoDuration) {
            videoDuration = await ffmpegService.getVideoDuration(video.filePath);
            videoModel.update(videoId, { duration: videoDuration });
        }

        // Use existing script or provided script
        const scriptText = script || video.script?.script;
        if (!scriptText) {
            return errorResponse(res, 'No script available for subtitle generation', 400);
        }

        const outputDir = path.join(config.upload.processedDir, videoId);

        const result = await subtitleService.processSubtitles(
            scriptText,
            videoDuration,
            outputDir,
            videoId,
            {
                format,
                addToVideo: true,
                videoPath: video.filePath,
                subtitleType,
                styling
            }
        );

        // Update video record
        const updateData = {
            subtitlePath: result.subtitlePath,
            subtitleFormat: format,
            subtitleType
        };

        if (result.videoWithSubtitles) {
            updateData.processedVideoPath = result.videoWithSubtitles;
            updateData.status = 'completed';
        }

        videoModel.update(videoId, updateData);

        successResponse(res, {
            videoId,
            subtitlePath: result.subtitlePath,
            videoWithSubtitles: result.videoWithSubtitles,
            format: result.format,
            subtitleType
        }, 'Subtitles added to video successfully');

    } catch (error) {
        console.error('Add subtitles to video error:', error);
        errorResponse(res, 'Failed to add subtitles to video', 500, error);
    }
};

/**
 * Process video with script to generate subtitles
 */
const processVideoWithSubtitles = async (req, res) => {
    console.log('🔍 DEBUG: Starting processVideoWithSubtitles');
    
    try {
        console.log('🔍 Step 1: Parsing request');
        const { script, format = 'srt', subtitleType = 'hard', styling = {} } = req.body;

        if (!req.file) {
            console.log('❌ ERROR: No file uploaded');
            return errorResponse(res, 'Video file is required', 400);
        }

        if (!script) {
            console.log('❌ ERROR: No script provided');  
            return errorResponse(res, 'Script is required', 400);
        }

        console.log('✅ Step 1 complete - Request parsed');
        console.log('Script length:', script.length);
        console.log('File name:', req.file.originalname);

        console.log('🔍 Step 2: Creating video record');
        const videoId = uuidv4();
        const videoPath = req.file.path;

        const videoData = {
            id: videoId,
            originalName: req.file.originalname,
            filePath: videoPath,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            status: 'processing',
            script: { script },
            uploadedAt: new Date().toISOString()
        };

        console.log('🔍 Step 3: Calling videoModel.create');
        videoModel.create(videoData);
        console.log('✅ Step 3 complete - Video record created');

        console.log('🔍 Step 4: Getting video duration with FFmpeg');
        // THIS IS LIKELY WHERE IT CRASHES
        const videoDuration = await ffmpegService.getVideoDuration(videoPath);
        console.log('✅ Step 4 complete - Video duration:', videoDuration);

        console.log('🔍 Step 5: Updating video record with duration');
        videoModel.update(videoId, { duration: videoDuration });
        console.log('✅ Step 5 complete - Duration updated');

        console.log('🔍 Step 6: Preparing subtitle processing');
        const outputDir = path.join(config.upload.processedDir, videoId);
        console.log('Output directory:', outputDir);

        console.log('🔍 Step 7: Processing subtitles');
        // THIS MIGHT ALSO CRASH
        const result = await subtitleService.processSubtitles(
            script,
            videoDuration,
            outputDir,
            videoId,
            {
                format,
                addToVideo: true,
                videoPath,
                subtitleType,
                styling
            }
        );
        console.log('✅ Step 7 complete - Subtitles processed');

        console.log('🔍 Step 8: Updating final video record');
        const updateData = {
            subtitlePath: result.subtitlePath,
            subtitleFormat: format,
            subtitleType,
            status: 'completed',
            processedAt: new Date().toISOString()
        };

        if (result.videoWithSubtitles) {
            updateData.processedVideoPath = result.videoWithSubtitles;
        }

        videoModel.update(videoId, updateData);
        console.log('✅ Step 8 complete - Record updated');

        console.log('🎉 SUCCESS: All processing complete');
        successResponse(res, {
            videoId,
            originalName: req.file.originalname,
            subtitlePath: result.subtitlePath,
            videoWithSubtitles: result.videoWithSubtitles,
            format: result.format,
            subtitleType,
            duration: videoDuration
        }, 'Video processed with subtitles successfully', 201);

    } catch (error) {
        console.error('💥 CRASH in processVideoWithSubtitles:', error);
        console.error('💥 Stack trace:', error.stack);
        errorResponse(res, 'Failed to process video with subtitles', 500, error);
    }
};

/**
 * Download subtitle file
 */
const downloadSubtitleFile = async (req, res) => {
    try {
        const { videoId } = req.params;

        const video = videoModel.findById(videoId);
        if (!video) {
            return notFoundResponse(res, 'Video');
        }

        if (!video.subtitlePath || !fs.existsSync(video.subtitlePath)) {
            return notFoundResponse(res, 'Subtitle file');
        }

        const fileName = `${video.originalName.split('.')[0]}_subtitles.${video.subtitleFormat || 'srt'}`;
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.download(video.subtitlePath, fileName);

    } catch (error) {
        console.error('Download subtitle file error:', error);
        errorResponse(res, 'Failed to download subtitle file', 500, error);
    }
};

/**
 * Get subtitle content
 */
const getSubtitleContent = async (req, res) => {
    try {
        const { videoId } = req.params;

        const video = videoModel.findById(videoId);
        if (!video) {
            return notFoundResponse(res, 'Video');
        }

        if (!video.subtitlePath || !fs.existsSync(video.subtitlePath)) {
            return notFoundResponse(res, 'Subtitle file');
        }

        const subtitleContent = fs.readFileSync(video.subtitlePath, 'utf8');

        successResponse(res, {
            videoId,
            format: video.subtitleFormat || 'srt',
            content: subtitleContent,
            subtitlePath: video.subtitlePath
        }, 'Subtitle content retrieved successfully');

    } catch (error) {
        console.error('Get subtitle content error:', error);
        errorResponse(res, 'Failed to get subtitle content', 500, error);
    }
};

/**
 * Update subtitle timing (regenerate with new parameters)
 */
const updateSubtitleTiming = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { timing, format } = req.body;

        const video = videoModel.findById(videoId);
        if (!video) {
            return notFoundResponse(res, 'Video');
        }

        const script = video.script?.script;
        if (!script) {
            return errorResponse(res, 'No script available for timing update', 400);
        }

        const outputDir = path.dirname(video.subtitlePath);
        
        // Regenerate subtitles with new timing
        const result = await subtitleService.processSubtitles(
            script,
            video.duration,
            outputDir,
            videoId,
            { format: format || video.subtitleFormat, timing }
        );

        // Update video record
        videoModel.update(videoId, {
            subtitlePath: result.subtitlePath,
            updatedAt: new Date().toISOString()
        });

        successResponse(res, {
            videoId,
            subtitlePath: result.subtitlePath,
            content: result.subtitleContent,
            format: result.format
        }, 'Subtitle timing updated successfully');

    } catch (error) {
        console.error('Update subtitle timing error:', error);
        errorResponse(res, 'Failed to update subtitle timing', 500, error);
    }
};

module.exports = {
    generateSubtitles,
    addSubtitlesToVideo,
    processVideoWithSubtitles,
    downloadSubtitleFile,
    getSubtitleContent,
    updateSubtitleTiming
}; 