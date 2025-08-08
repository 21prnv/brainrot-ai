const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const ffmpegService = require('../services/ffmpegService');
const openaiService = require('../services/openaiService');
const elevenlabsService = require('../services/elevenlabsService');
const videoModel = require('../models/videoModel');
const { ensureDirectoryExists } = require('../middleware/uploadMiddleware');
const config = require('../config/config');

// Upload video
const uploadVideo = async (req, res) => {
    try {
        const videoId = uuidv4();
        const videoPath = req.file.path;
        const originalName = req.file.originalname;
        
        // Create video record
        const videoData = {
            id: videoId,
            originalName,
            filePath: videoPath,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            status: 'uploaded',
            uploadedAt: new Date().toISOString(),
            prompt: req.body.prompt || '',
            style: req.body.style || 'casual',
            voice: req.body.voice || null
        };

        videoModel.create(videoData);

        res.status(201).json({
            success: true,
            data: {
                videoId,
                originalName,
                fileSize: req.file.size,
                status: 'uploaded',
                message: 'Video uploaded successfully'
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to upload video'
            }
        });
    }
};

// Process video - main pipeline
const processVideo = async (req, res) => {
    try {
        const { videoId } = req.params;
        const video = videoModel.findById(videoId);
        
        if (!video) {
            return res.status(404).json({
                success: false,
                error: { message: 'Video not found' }
            });
        }

        // Update status to processing
        videoModel.updateStatus(videoId, 'processing');

        // Start processing asynchronously
        processVideoAsync(videoId, req.body);

        res.json({
            success: true,
            data: {
                videoId,
                status: 'processing',
                message: 'Video processing started'
            }
        });
    } catch (error) {
        console.error('Process error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to start video processing'
            }
        });
    }
};

// Async video processing function
const processVideoAsync = async (videoId, options = {}) => {
    try {
        const video = videoModel.findById(videoId);
        
        // Step 1: Extract frames
        videoModel.updateStatus(videoId, 'extracting_frames');
        const framesPath = await ffmpegService.extractFrames(video.filePath, videoId);
        videoModel.updateFrames(videoId, framesPath);

        // Step 2: Generate script using OpenAI
        videoModel.updateStatus(videoId, 'generating_script');
        const prompt = options.prompt || video.prompt || 'Generate an engaging script for this video';
        const style = options.style || video.style || 'casual';
        const script = await openaiService.generateScript(framesPath, prompt, style);
        videoModel.updateScript(videoId, script);

        // Step 3: Generate audio using ElevenLabs
        videoModel.updateStatus(videoId, 'generating_audio');
        const audioPath = await elevenlabsService.generateAudio(script, videoId, video.voice);
        videoModel.updateAudio(videoId, audioPath);

        // Step 4: Merge video with new audio
        videoModel.updateStatus(videoId, 'merging_audio');
        const outputPath = await ffmpegService.mergeVideoWithAudio(video.filePath, audioPath, videoId);
        videoModel.updateOutput(videoId, outputPath);

        // Mark as completed
        videoModel.updateStatus(videoId, 'completed');
        
        console.log(`Video ${videoId} processed successfully`);
    } catch (error) {
        console.error(`Processing failed for video ${videoId}:`, error);
        videoModel.updateStatus(videoId, 'failed');
        videoModel.updateError(videoId, error.message);
    }
};

// Get video status
const getVideoStatus = async (req, res) => {
    try {
        const { videoId } = req.params;
        const video = videoModel.findById(videoId);
        
        if (!video) {
            return res.status(404).json({
                success: false,
                error: { message: 'Video not found' }
            });
        }

        res.json({
            success: true,
            data: {
                videoId,
                status: video.status,
                originalName: video.originalName,
                uploadedAt: video.uploadedAt,
                processedAt: video.processedAt,
                error: video.error
            }
        });
    } catch (error) {
        console.error('Status error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to get video status'
            }
        });
    }
};

// Download processed video
const downloadVideo = async (req, res) => {
    try {
        const { videoId } = req.params;
        const video = videoModel.findById(videoId);
        
        if (!video) {
            return res.status(404).json({
                success: false,
                error: { message: 'Video not found' }
            });
        }

        if (video.status !== 'completed' || !video.outputPath) {
            return res.status(400).json({
                success: false,
                error: { message: 'Video not ready for download' }
            });
        }

        if (!fs.existsSync(video.outputPath)) {
            return res.status(404).json({
                success: false,
                error: { message: 'Processed video file not found' }
            });
        }

        res.download(video.outputPath, `processed_${video.originalName}`);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to download video'
            }
        });
    }
};

// Get video frames
const getVideoFrames = async (req, res) => {
    try {
        const { videoId } = req.params;
        const video = videoModel.findById(videoId);
        
        if (!video || !video.framesPath) {
            return res.status(404).json({
                success: false,
                error: { message: 'Video or frames not found' }
            });
        }

        const frames = fs.readdirSync(video.framesPath)
            .filter(file => file.endsWith('.jpg'))
            .map(file => ({
                filename: file,
                path: path.join(video.framesPath, file)
            }));

        res.json({
            success: true,
            data: {
                videoId,
                frames: frames.length,
                framesList: frames
            }
        });
    } catch (error) {
        console.error('Frames error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to get video frames'
            }
        });
    }
};

// Get generated script
const getGeneratedScript = async (req, res) => {
    try {
        const { videoId } = req.params;
        const video = videoModel.findById(videoId);
        
        if (!video) {
            return res.status(404).json({
                success: false,
                error: { message: 'Video not found' }
            });
        }

        res.json({
            success: true,
            data: {
                videoId,
                script: video.script || '',
                hasScript: !!video.script
            }
        });
    } catch (error) {
        console.error('Script error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to get script'
            }
        });
    }
};

// Update script
const updateScript = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { script, voice } = req.body;
        
        const video = videoModel.findById(videoId);
        if (!video) {
            return res.status(404).json({
                success: false,
                error: { message: 'Video not found' }
            });
        }

        videoModel.updateScript(videoId, script);
        if (voice) {
            videoModel.updateVoice(videoId, voice);
        }

        res.json({
            success: true,
            data: {
                videoId,
                script,
                message: 'Script updated successfully'
            }
        });
    } catch (error) {
        console.error('Update script error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to update script'
            }
        });
    }
};

// Generate audio from script
const generateAudio = async (req, res) => {
    try {
        const { videoId } = req.params;
        const video = videoModel.findById(videoId);
        
        if (!video || !video.script) {
            return res.status(404).json({
                success: false,
                error: { message: 'Video or script not found' }
            });
        }

        // Generate audio asynchronously
        videoModel.updateStatus(videoId, 'generating_audio');
        const audioPath = await elevenlabsService.generateAudio(video.script, videoId, video.voice);
        videoModel.updateAudio(videoId, audioPath);

        res.json({
            success: true,
            data: {
                videoId,
                audioPath,
                message: 'Audio generated successfully'
            }
        });
    } catch (error) {
        console.error('Audio generation error:', error);
        videoModel.updateStatus(videoId, 'failed');
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to generate audio'
            }
        });
    }
};

// List all videos
const listVideos = async (req, res) => {
    try {
        const videos = videoModel.findAll();
        
        res.json({
            success: true,
            data: {
                videos: videos.map(video => ({
                    id: video.id,
                    originalName: video.originalName,
                    status: video.status,
                    uploadedAt: video.uploadedAt,
                    processedAt: video.processedAt
                }))
            }
        });
    } catch (error) {
        console.error('List videos error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to list videos'
            }
        });
    }
};

// Delete video
const deleteVideo = async (req, res) => {
    try {
        const { videoId } = req.params;
        const video = videoModel.findById(videoId);
        
        if (!video) {
            return res.status(404).json({
                success: false,
                error: { message: 'Video not found' }
            });
        }

        // Delete associated files
        const filesToDelete = [
            video.filePath,
            video.audioPath,
            video.outputPath
        ].filter(Boolean);

        filesToDelete.forEach(file => {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        });

        // Delete frames directory
        if (video.framesPath && fs.existsSync(video.framesPath)) {
            fs.rmSync(video.framesPath, { recursive: true, force: true });
        }

        // Delete video record
        videoModel.deleteById(videoId);

        res.json({
            success: true,
            data: {
                videoId,
                message: 'Video deleted successfully'
            }
        });
    } catch (error) {
        console.error('Delete video error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to delete video'
            }
        });
    }
};

module.exports = {
    uploadVideo,
    processVideo,
    getVideoStatus,
    downloadVideo,
    getVideoFrames,
    getGeneratedScript,
    updateScript,
    generateAudio,
    listVideos,
    deleteVideo
}; 