const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

// Configure FFmpeg path for Windows
try {
    // Try common Windows locations
    const possiblePaths = [
        'ffmpeg', // If in PATH
        'C:\\ffmpeg\\bin\\ffmpeg.exe',
        'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe',
        process.env.FFMPEG_PATH
    ];
    
    let ffmpegFound = false;
    for (const ffmpegPath of possiblePaths) {
        if (ffmpegPath) {
            try {
                ffmpeg.setFfmpegPath(ffmpegPath);
                ffmpeg.setFfprobePath(ffmpegPath.replace('ffmpeg', 'ffprobe'));
                console.log(`✅ FFmpeg configured: ${ffmpegPath}`);
                ffmpegFound = true;
                break;
            } catch (e) {
                // Continue to next path
            }
        }
    }
    
    if (!ffmpegFound) {
        console.log('⚠️  FFmpeg path not configured - using system PATH');
    }
} catch (error) {
    console.log('⚠️  FFmpeg configuration failed:', error.message);
}

/**
 * Extract frames from a video file
 * @param {string} videoPath - Path to the video file
 * @param {string} outputDir - Directory to save frames
 * @param {number} frameRate - Frame extraction rate (default: 1/3)
 * @param {number} maxFrames - Maximum number of frames to extract
 * @returns {Promise<string[]>} Array of frame file paths
 */
const extractFrames = (videoPath, outputDir, frameRate = config.ffmpeg.frameRate, maxFrames = config.ffmpeg.maxFrames) => {
    return new Promise((resolve, reject) => {
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const framePaths = [];
        const outputPattern = path.join(outputDir, 'frame_%03d.jpg');

        ffmpeg(videoPath)
            .outputOptions([
                `-vf fps=${frameRate}`,
                `-vframes ${maxFrames}`,
                '-q:v 2' // High quality
            ])
            .output(outputPattern)
            .on('end', () => {
                // Get all generated frame files
                const files = fs.readdirSync(outputDir)
                    .filter(file => file.startsWith('frame_') && file.endsWith('.jpg'))
                    .sort()
                    .map(file => path.join(outputDir, file));
                
                resolve(files);
            })
            .on('error', (err) => {
                console.error('Frame extraction error:', err);
                reject(err);
            })
            .run();
    });
};

/**
 * Get video duration in seconds with detailed debugging
 * @param {string} videoPath - Path to the video file
 * @returns {Promise<number>} Duration in seconds
 */
const getVideoDuration = (videoPath) => {
    return new Promise((resolve, reject) => {
        console.log('🔍 FFmpeg DEBUG: Starting getVideoDuration');
        console.log('🔍 FFmpeg DEBUG: Video path:', videoPath);
        
        // Check file extension first
        const fileExt = path.extname(videoPath).toLowerCase();
        console.log('🔍 FFmpeg DEBUG: File extension:', fileExt);
        
        if (!['.mp4', '.avi', '.mov', '.mkv', '.webm'].includes(fileExt)) {
            console.log('❌ FFmpeg ERROR: Unsupported file format');
            reject(new Error(`Unsupported video format: ${fileExt}`));
            return;
        }
        
        // Check if file exists and get file info
        try {
            const fileExists = fs.existsSync(videoPath);
            console.log('🔍 FFmpeg DEBUG: File exists:', fileExists);
            
            if (!fileExists) {
                reject(new Error(`Video file not found: ${videoPath}`));
                return;
            }
            
            const stats = fs.statSync(videoPath);
            console.log('🔍 FFmpeg DEBUG: File size:', stats.size, 'bytes');
            
            // Check if file is too small (might be corrupted)
            if (stats.size < 1000) {
                console.log('❌ FFmpeg ERROR: File too small, might be corrupted');
                reject(new Error('Video file appears to be corrupted (too small)'));
                return;
            }
            
        } catch (fileError) {
            console.log('❌ FFmpeg ERROR: File access error:', fileError);
            reject(fileError);
            return;
        }
        
        console.log('🔍 FFmpeg DEBUG: Testing simple ffprobe command...');
        const { exec } = require('child_process');
        
        // Try a simpler ffprobe command first
        const simpleCommand = `ffprobe -v quiet -print_format json -show_format "${videoPath}"`;
        console.log('🔍 FFmpeg DEBUG: Simple command:', simpleCommand);
        
        exec(simpleCommand, { timeout: 10000 }, (error, stdout, stderr) => {
            console.log('🔍 FFmpeg DEBUG: Simple ffprobe results:');
            console.log('  - Error:', error?.message || 'none');
            console.log('  - Stderr:', stderr?.trim() || 'empty');
            
            if (error) {
                console.log('❌ FFmpeg ERROR: Simple ffprobe failed:', error.message);
                
                // If simple command fails, return a default duration
                console.log('🔧 FFmpeg FALLBACK: Using default duration of 30 seconds');
                resolve(30.0); // Fallback duration
                return;
            }
            
            try {
                const result = JSON.parse(stdout);
                const duration = parseFloat(result.format.duration);
                
                if (isNaN(duration)) {
                    console.log('❌ FFmpeg ERROR: Could not parse duration');
                    resolve(30.0); // Fallback
                    return;
                }
                
                console.log('✅ FFmpeg SUCCESS: Duration =', duration, 'seconds');
                resolve(duration);
                
            } catch (parseError) {
                console.log('❌ FFmpeg ERROR: JSON parse failed:', parseError.message);
                console.log('🔧 FFmpeg FALLBACK: Using default duration of 30 seconds');
                resolve(30.0); // Fallback duration
            }
        });
    });
};

/**
 * Get video metadata
 * @param {string} videoPath - Path to the video file
 * @returns {Promise<object>} Video metadata
 */
const getVideoMetadata = (videoPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
                reject(err);
                return;
            }
            
            const videoStream = metadata.streams.find(s => s.codec_type === 'video');
            const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
            
            resolve({
                duration: metadata.format.duration,
                fileSize: metadata.format.size,
                bitRate: metadata.format.bit_rate,
                video: videoStream ? {
                    codec: videoStream.codec_name,
                    width: videoStream.width,
                    height: videoStream.height,
                    frameRate: videoStream.avg_frame_rate,
                    bitRate: videoStream.bit_rate
                } : null,
                audio: audioStream ? {
                    codec: audioStream.codec_name,
                    sampleRate: audioStream.sample_rate,
                    channels: audioStream.channels,
                    bitRate: audioStream.bit_rate
                } : null
            });
        });
    });
};

/**
 * Merge video with new audio track
 * @param {string} videoPath - Path to the original video
 * @param {string} audioPath - Path to the new audio file
 * @param {string} outputPath - Path for the merged video
 * @returns {Promise<string>} Path to the merged video
 */
const mergeVideoWithAudio = (videoPath, audioPath, outputPath) => {
    return new Promise((resolve, reject) => {
        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        ffmpeg()
            .input(videoPath)
            .input(audioPath)
            .outputOptions([
                '-c:v copy',           // Copy video codec (no re-encoding)
                '-c:a aac',            // Use AAC for audio
                '-b:a 128k',           // Audio bitrate
                '-map 0:v:0',          // Map video from first input
                '-map 1:a:0',          // Map audio from second input
                '-shortest',           // End when shortest stream ends
                '-avoid_negative_ts make_zero' // Handle timing issues
            ])
            .output(outputPath)
            .on('end', () => {
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('Video merge error:', err);
                reject(err);
            })
            .on('progress', (progress) => {
                console.log('Processing: ' + progress.percent + '% done');
            })
            .run();
    });
};

/**
 * Convert audio to MP3 format
 * @param {string} inputPath - Path to input audio file
 * @param {string} outputPath - Path for output MP3 file
 * @returns {Promise<string>} Path to converted MP3 file
 */
const convertToMp3 = (inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        ffmpeg(inputPath)
            .audioCodec('libmp3lame')
            .audioBitrate(config.ffmpeg.audioBitrate)
            .format('mp3')
            .output(outputPath)
            .on('end', () => {
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('Audio conversion error:', err);
                reject(err);
            })
            .run();
    });
};

/**
 * Add text overlay to video
 * @param {string} videoPath - Path to the video file
 * @param {string} outputPath - Path for the output video
 * @param {string} text - Text to overlay
 * @param {object} options - Overlay options
 * @returns {Promise<string>} Path to the output video
 */
const addTextOverlay = (videoPath, outputPath, text, options = {}) => {
    return new Promise((resolve, reject) => {
        const {
            fontSize = 24,
            fontColor = 'white',
            position = 'bottom',
            fontFile = null
        } = options;

        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        let filterComplex = `drawtext=text='${text}':fontsize=${fontSize}:fontcolor=${fontColor}:x=(w-text_w)/2`;
        
        if (position === 'bottom') {
            filterComplex += ':y=h-text_h-20';
        } else if (position === 'top') {
            filterComplex += ':y=20';
        } else {
            filterComplex += ':y=(h-text_h)/2';
        }

        if (fontFile) {
            filterComplex += `:fontfile=${fontFile}`;
        }

        ffmpeg(videoPath)
            .outputOptions([
                '-vf', filterComplex,
                '-c:a copy'
            ])
            .output(outputPath)
            .on('end', () => {
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('Text overlay error:', err);
                reject(err);
            })
            .run();
    });
};

module.exports = {
    extractFrames,
    getVideoDuration,
    getVideoMetadata,
    mergeVideoWithAudio,
    convertToMp3,
    addTextOverlay
}; 