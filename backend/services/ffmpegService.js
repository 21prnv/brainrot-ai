const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

// Ensure FFmpeg can find the binary (adjust path as needed)
// ffmpeg.setFfmpegPath('/usr/bin/ffmpeg'); // Uncomment and adjust if needed

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
 * Get video duration in seconds
 * @param {string} videoPath - Path to the video file
 * @returns {Promise<number>} Duration in seconds
 */
const getVideoDuration = (videoPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(metadata.format.duration);
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