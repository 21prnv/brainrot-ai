const express = require('express');
const router = express.Router();
const { uploadVideo } = require('../middleware/uploadMiddleware');
const subtitleController = require('../controllers/subtitleController');
const { validateSubtitleGeneration } = require('../middleware/validation');

// Generate subtitles from script text
router.post('/generate', validateSubtitleGeneration, subtitleController.generateSubtitles);

// Add subtitles to video
router.post('/add-to-video/:videoId', subtitleController.addSubtitlesToVideo);

// Upload video and generate subtitles with script
router.post('/process', uploadVideo, subtitleController.processVideoWithSubtitles);

// Download subtitle file
router.get('/download/:videoId', subtitleController.downloadSubtitleFile);

// Get subtitle content
router.get('/content/:videoId', subtitleController.getSubtitleContent);

// Update subtitle timing
router.put('/timing/:videoId', subtitleController.updateSubtitleTiming);

// DEBUG: Test route to isolate the crash
router.post('/debug-test', uploadVideo, async (req, res) => {
    console.log('🔍 DEBUG: Starting debug test');
    
    try {
        // Test 1: Basic request parsing
        console.log('✅ Step 1: Request received');
        console.log('File info:', req.file ? {
            name: req.file.originalname,
            size: req.file.size,
            path: req.file.path
        } : 'No file');
        
        // Test 2: Import dependencies one by one
        console.log('✅ Step 2: Testing imports');
        const { v4: uuidv4 } = require('uuid');
        console.log('✅ UUID import OK');
        
        const path = require('path');
        console.log('✅ Path import OK');
        
        const fs = require('fs');
        console.log('✅ FS import OK');
        
        const config = require('../config/config');
        console.log('✅ Config import OK');
        
        // Test 3: Test video model
        console.log('✅ Step 3: Testing video model');
        const videoModel = require('../models/videoModel');
        console.log('✅ Video model import OK');
        
        // Test 4: Test ffmpeg service  
        console.log('✅ Step 4: Testing ffmpeg service');
        const ffmpegService = require('../services/ffmpegService');
        console.log('✅ FFmpeg service import OK');
        
        // Test 5: Test subtitle service
        console.log('✅ Step 5: Testing subtitle service');
        const subtitleService = require('../services/subtitleService');
        console.log('✅ Subtitle service import OK');
        
        // Test 6: Test basic operations
        console.log('✅ Step 6: Testing basic operations');
        const videoId = uuidv4();
        console.log('✅ UUID generation OK:', videoId);
        
        if (req.file && fs.existsSync(req.file.path)) {
            console.log('✅ File exists and is accessible');
        } else {
            console.log('❌ File issue:', req.file?.path);
        }
        
        res.json({
            success: true,
            message: 'All tests passed!',
            videoId,
            file: req.file ? {
                name: req.file.originalname,
                size: req.file.size,
                exists: fs.existsSync(req.file.path)
            } : null
        });
        
    } catch (error) {
        console.error('💥 DEBUG TEST CRASHED:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

// Test in browser console at http://localhost:3000
router.post('/test', (req, res) => {
    console.log('✅ Test route reached successfully!');
    res.json({ 
        success: true, 
        message: 'Backend connection working',
        timestamp: new Date().toISOString()
    });
});

module.exports = router; 