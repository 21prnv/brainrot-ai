const express = require('express');
const router = express.Router();
const { uploadVideo } = require('../middleware/uploadMiddleware');
const videoController = require('../controllers/videoController');
const { validateVideoUpload, validateScriptGeneration } = require('../middleware/validation');

// Upload video
router.post('/upload', uploadVideo, validateVideoUpload, videoController.uploadVideo);

// Process video (extract frames, generate script, create audio, merge)
router.post('/process/:videoId', validateScriptGeneration, videoController.processVideo);

// Get video status
router.get('/status/:videoId', videoController.getVideoStatus);

// Get processed video
router.get('/download/:videoId', videoController.downloadVideo);

// Get video frames
router.get('/frames/:videoId', videoController.getVideoFrames);

// Get generated script
router.get('/script/:videoId', videoController.getGeneratedScript);

// Update script (for editing before audio generation)
router.put('/script/:videoId', videoController.updateScript);

// Generate audio from script
router.post('/audio/:videoId', videoController.generateAudio);

// List all videos for a user (if you add user auth later)
router.get('/list', videoController.listVideos);

// Delete video and associated files
router.delete('/:videoId', videoController.deleteVideo);

module.exports = router; 