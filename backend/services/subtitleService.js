const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const config = require('../config/config');

/**
 * Convert script text to SRT subtitle format
 * @param {string} scriptText - The script text
 * @param {number} videoDuration - Video duration in seconds
 * @returns {string} SRT formatted subtitles
 */
const convertScriptToSRT = (scriptText, videoDuration) => {
    // Split script into sentences
    const sentences = scriptText
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

    if (sentences.length === 0) {
        return '';
    }

    // Calculate timing for each sentence
    const timePerSentence = videoDuration / sentences.length;
    let srtContent = '';

    sentences.forEach((sentence, index) => {
        const startTime = index * timePerSentence;
        const endTime = (index + 1) * timePerSentence;

        // Format time as SRT format (HH:MM:SS,mmm)
        const formatTime = (seconds) => {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            const milliseconds = Math.floor((seconds % 1) * 1000);
            
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
        };

        srtContent += `${index + 1}\n`;
        srtContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
        srtContent += `${sentence.trim()}\n\n`;
    });

    return srtContent;
};

/**
 * Convert script text to WebVTT subtitle format
 * @param {string} scriptText - The script text
 * @param {number} videoDuration - Video duration in seconds
 * @returns {string} WebVTT formatted subtitles
 */
const convertScriptToVTT = (scriptText, videoDuration) => {
    const sentences = scriptText
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

    if (sentences.length === 0) {
        return 'WEBVTT\n\n';
    }

    const timePerSentence = videoDuration / sentences.length;
    let vttContent = 'WEBVTT\n\n';

    sentences.forEach((sentence, index) => {
        const startTime = index * timePerSentence;
        const endTime = (index + 1) * timePerSentence;

        // Format time as WebVTT format (HH:MM:SS.mmm)
        const formatTime = (seconds) => {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            const milliseconds = Math.floor((seconds % 1) * 1000);
            
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
        };

        vttContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
        vttContent += `${sentence.trim()}\n\n`;
    });

    return vttContent;
};

/**
 * Create an advanced subtitle timing based on word count
 * @param {string} scriptText - The script text
 * @param {number} videoDuration - Video duration in seconds
 * @param {string} format - Subtitle format ('srt' or 'vtt')
 * @returns {string} Formatted subtitles with smart timing
 */
const createSmartSubtitles = (scriptText, videoDuration, format = 'srt') => {
    // Split into sentences and calculate reading time based on word count
    const sentences = scriptText
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

    if (sentences.length === 0) {
        return format === 'srt' ? '' : 'WEBVTT\n\n';
    }

    // Calculate words per minute (average reading speed: 150-200 WPM)
    const wordsPerMinute = 180;
    const totalWords = scriptText.split(/\s+/).length;
    const estimatedReadingTime = (totalWords / wordsPerMinute) * 60; // in seconds

    // Use the shorter duration (video or reading time) for better pacing
    const effectiveDuration = Math.min(videoDuration, estimatedReadingTime * 1.2);

    let subtitles = format === 'vtt' ? 'WEBVTT\n\n' : '';
    let currentTime = 0;

    sentences.forEach((sentence, index) => {
        const words = sentence.split(/\s+/).length;
        const sentenceDuration = (words / wordsPerMinute) * 60 * 1.2; // Add 20% buffer
        const endTime = Math.min(currentTime + sentenceDuration, videoDuration);

        const formatTime = (seconds) => {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            const milliseconds = Math.floor((seconds % 1) * 1000);
            
            if (format === 'srt') {
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
            } else {
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
            }
        };

        if (format === 'srt') {
            subtitles += `${index + 1}\n`;
        }
        
        subtitles += `${formatTime(currentTime)} --> ${formatTime(endTime)}\n`;
        subtitles += `${sentence.trim()}\n\n`;

        currentTime = endTime + 0.5; // Small gap between subtitles
    });

    return subtitles;
};

/**
 * Save subtitle content to file
 * @param {string} subtitleContent - Subtitle content
 * @param {string} outputPath - Output file path
 * @returns {Promise<string>} Path to saved file
 */
const saveSubtitleFile = async (subtitleContent, outputPath) => {
    return new Promise((resolve, reject) => {
        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFile(outputPath, subtitleContent, 'utf8', (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(outputPath);
            }
        });
    });
};

/**
 * Burn subtitles directly into video (hard subtitles)
 * @param {string} videoPath - Input video path
 * @param {string} subtitlePath - Subtitle file path
 * @param {string} outputPath - Output video path
 * @param {object} options - Subtitle styling options
 * @returns {Promise<string>} Path to output video
 */
const burnSubtitlesIntoVideo = (videoPath, subtitlePath, outputPath, options = {}) => {
    return new Promise((resolve, reject) => {
        console.log('🔍 BURN DEBUG: Starting SIMPLIFIED burnSubtitlesIntoVideo');
        console.log('🔍 BURN DEBUG: Video path:', videoPath);
        console.log('🔍 BURN DEBUG: Subtitle path:', subtitlePath);
        console.log('🔍 BURN DEBUG: Output path:', outputPath);
        
        // Check if input files exist
        if (!fs.existsSync(videoPath)) {
            console.log('❌ BURN ERROR: Video file not found');
            reject(new Error(`Video file not found: ${videoPath}`));
            return;
        }
        
        if (!fs.existsSync(subtitlePath)) {
            console.log('❌ BURN ERROR: Subtitle file not found');
            reject(new Error(`Subtitle file not found: ${subtitlePath}`));
            return;
        }
        
        console.log('✅ BURN DEBUG: Input files exist');
        
        // Debug: Check subtitle file content
        console.log('🔍 BURN DEBUG: Checking subtitle file content...');
        try {
            const subtitleContent = fs.readFileSync(subtitlePath, 'utf8');
            console.log('🔍 BURN DEBUG: Subtitle file size:', subtitleContent.length, 'characters');
            console.log('🔍 BURN DEBUG: First 200 characters of subtitle:');
            console.log(subtitleContent.substring(0, 200));
            console.log('🔍 BURN DEBUG: Last 200 characters of subtitle:');
            console.log(subtitleContent.substring(Math.max(0, subtitleContent.length - 200)));
        } catch (readError) {
            console.log('❌ BURN ERROR: Cannot read subtitle file:', readError);
        }
        
        // Debug: Test FFmpeg with a simple command first
        console.log('🔍 BURN DEBUG: Testing simple FFmpeg command...');
        const { exec } = require('child_process');
        const testCommand = `ffmpeg -i "${videoPath}" -t 1 -f null -`;
        
        exec(testCommand, { timeout: 10000 }, (error, stdout, stderr) => {
            console.log('🔍 BURN DEBUG: Simple FFmpeg test results:');
            console.log('  - Error:', error?.message || 'none');
            console.log('  - Stderr sample:', stderr?.substring(0, 200) || 'empty');
            
            if (error) {
                console.log('❌ BURN ERROR: Basic FFmpeg test failed');
                reject(new Error(`Basic FFmpeg test failed: ${error.message}`));
                return;
            }
            
            console.log('✅ BURN DEBUG: Basic FFmpeg test passed, proceeding with subtitle burn...');
            
            // Now try the actual subtitle burn
            startSubtitleBurn();
        });
        
        function startSubtitleBurn() {
            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
                console.log('🔍 BURN DEBUG: Created output directory');
            }

            // Use simple subtitle filter without complex styling
            console.log('🔍 BURN DEBUG: Using simplified subtitle approach');
            
            // Add timeout for very long operations
            const timeout = setTimeout(() => {
                console.log('⏰ BURN TIMEOUT: FFmpeg subtitle burn taking too long (10 minutes)');
                reject(new Error('Subtitle burning timeout after 10 minutes'));
            }, 600000); // 10 minute timeout

            ffmpeg(videoPath)
                .outputOptions([
                    '-vf', `subtitles=${subtitlePath.replace(/\\/g, '/')}`,
                    '-c:a copy' // Copy audio without re-encoding
                ])
                .output(outputPath)
                .on('start', (commandLine) => {
                    console.log('🔍 BURN DEBUG: FFmpeg command started successfully!');
                    console.log('🔍 BURN DEBUG: Command:', commandLine);
                })
                .on('end', () => {
                    clearTimeout(timeout);
                    console.log('✅ BURN SUCCESS: Subtitle burning completed');
                    
                    // Check if output file was created
                    if (fs.existsSync(outputPath)) {
                        const outputSize = fs.statSync(outputPath).size;
                        console.log('🔍 BURN DEBUG: Output file size:', outputSize, 'bytes');
                        resolve(outputPath);
                    } else {
                        console.log('❌ BURN ERROR: Output file was not created');
                        reject(new Error('Output file was not created'));
                    }
                })
                .on('error', (err) => {
                    clearTimeout(timeout);
                    console.error('❌ BURN ERROR: FFmpeg subtitle burning failed:', err);
                    console.error('❌ BURN ERROR: Error message:', err.message);
                    console.error('❌ BURN ERROR: Error stack:', err.stack);
                    reject(err);
                })
                .on('progress', (progress) => {
                    if (progress.percent) {
                        console.log('🔍 BURN PROGRESS:', `${progress.percent.toFixed(1)}% complete`);
                    } else {
                        console.log('🔍 BURN PROGRESS: Processing...');
                    }
                })
                .run();
        }
    });
};

/**
 * Add soft subtitles to video (as separate track)
 * @param {string} videoPath - Input video path
 * @param {string} subtitlePath - Subtitle file path
 * @param {string} outputPath - Output video path
 * @param {string} language - Subtitle language code
 * @returns {Promise<string>} Path to output video
 */
const addSoftSubtitles = (videoPath, subtitlePath, outputPath, language = 'en') => {
    return new Promise((resolve, reject) => {
        console.log('🔍 SOFT DEBUG: Starting addSoftSubtitles');
        console.log('🔍 SOFT DEBUG: Video path:', videoPath);
        console.log('🔍 SOFT DEBUG: Subtitle path:', subtitlePath);
        console.log('🔍 SOFT DEBUG: Output path:', outputPath);

        // Check if input files exist
        if (!fs.existsSync(videoPath)) {
            console.log('❌ SOFT ERROR: Video file not found');
            reject(new Error(`Video file not found: ${videoPath}`));
            return;
        }

        if (!fs.existsSync(subtitlePath)) {
            console.log('❌ SOFT ERROR: Subtitle file not found');
            reject(new Error(`Subtitle file not found: ${subtitlePath}`));
            return;
        }

        console.log('✅ SOFT DEBUG: Input files exist');

        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log('🔍 SOFT DEBUG: Created output directory');
        }

        // Add timeout for long operations
        const timeout = setTimeout(() => {
            console.log('⏰ SOFT TIMEOUT: Soft subtitle addition taking too long (5 minutes)');
            reject(new Error('Soft subtitle addition timeout after 5 minutes'));
        }, 300000); // 5 minute timeout

        console.log('🔍 SOFT DEBUG: Starting FFmpeg process...');

        ffmpeg()
            .input(videoPath)
            .input(subtitlePath)
            .outputOptions([
                '-c copy', // Copy all streams without re-encoding
                `-metadata:s:s:0 language=${language}`,
                '-disposition:s:0 default' // Make subtitle track default
            ])
            .output(outputPath)
            .on('start', (commandLine) => {
                console.log('✅ SOFT DEBUG: FFmpeg command started successfully!');
                console.log('🔍 SOFT DEBUG: Command:', commandLine);
            })
            .on('end', () => {
                clearTimeout(timeout);
                console.log('✅ SOFT SUCCESS: Soft subtitle addition completed');

                // Check if output file was created
                if (fs.existsSync(outputPath)) {
                    const outputSize = fs.statSync(outputPath).size;
                    console.log('🔍 SOFT DEBUG: Output file size:', outputSize, 'bytes');
                    resolve(outputPath);
                } else {
                    console.log('❌ SOFT ERROR: Output file was not created');
                    reject(new Error('Output file was not created'));
                }
            })
            .on('error', (err) => {
                clearTimeout(timeout);
                console.error('❌ SOFT ERROR: FFmpeg soft subtitle addition failed:', err);
                console.error('❌ SOFT ERROR: Error message:', err.message);
                reject(err);
            })
            .on('progress', (progress) => {
                if (progress.percent) {
                    console.log('🔍 SOFT PROGRESS:', `${progress.percent.toFixed(1)}% complete`);
                } else {
                    console.log('🔍 SOFT PROGRESS: Processing...');
                }
            })
            .run();

        console.log('🔍 SOFT DEBUG: FFmpeg process initiated, waiting for completion...');
    });
};

/**
 * Generate subtitle file and optionally add to video
 * @param {string} scriptText - Script text
 * @param {number} videoDuration - Video duration in seconds
 * @param {string} outputDir - Output directory
 * @param {string} videoId - Video ID for file naming
 * @param {object} options - Processing options
 * @returns {Promise<object>} Result with file paths
 */
const processSubtitles = async (scriptText, videoDuration, outputDir, videoId, options = {}) => {
    try {
        console.log('🔍 SUBTITLE DEBUG: Starting processSubtitles');
        console.log('🔍 SUBTITLE DEBUG: Script length:', scriptText.length);
        console.log('🔍 SUBTITLE DEBUG: Video duration:', videoDuration);
        console.log('🔍 SUBTITLE DEBUG: Output directory:', outputDir);
        console.log('🔍 SUBTITLE DEBUG: Options:', JSON.stringify(options, null, 2));
        
        const {
            format = 'srt', // 'srt' or 'vtt'
            addToVideo = false,
            videoPath = null,
            subtitleType = 'hard', // 'hard' (burned) or 'soft' (separate track)
            styling = {}
        } = options;

        console.log('🔍 SUBTITLE DEBUG: Parsed options:', { format, addToVideo, subtitleType, videoPath: !!videoPath });

        // Generate subtitle content
        console.log('🔍 SUBTITLE DEBUG: Step 7.1 - Generating subtitle content...');
        const subtitleContent = createSmartSubtitles(scriptText, videoDuration, format);
        console.log('✅ SUBTITLE DEBUG: Step 7.1 complete - Subtitle content generated:', subtitleContent.length, 'characters');
        
        // Save subtitle file
        console.log('🔍 SUBTITLE DEBUG: Step 7.2 - Saving subtitle file...');
        const subtitleFileName = `${videoId}_subtitles.${format}`;
        const subtitlePath = path.join(outputDir, subtitleFileName);
        console.log('🔍 SUBTITLE DEBUG: Subtitle file path:', subtitlePath);
        
        await saveSubtitleFile(subtitleContent, subtitlePath);
        console.log('✅ SUBTITLE DEBUG: Step 7.2 complete - Subtitle file saved');

        const result = {
            subtitlePath,
            subtitleContent,
            format
        };

        // Optionally add subtitles to video
        if (addToVideo && videoPath) {
            console.log('🔍 SUBTITLE DEBUG: Step 7.3 - Adding subtitles to video...');
            console.log('🔍 SUBTITLE DEBUG: Video path:', videoPath);
            console.log('🔍 SUBTITLE DEBUG: Subtitle type:', subtitleType);
            
            const outputVideoPath = path.join(outputDir, `${videoId}_with_subtitles.mp4`);
            console.log('🔍 SUBTITLE DEBUG: Output video path:', outputVideoPath);

            if (subtitleType === 'soft') {
                console.log('🔍 SUBTITLE DEBUG: Step 7.3a - Adding soft subtitles...');
                try {
                    await addSoftSubtitles(videoPath, subtitlePath, outputVideoPath);
                    console.log('✅ SUBTITLE DEBUG: Step 7.3a complete - Soft subtitles added');
                    result.videoWithSubtitles = outputVideoPath;
                } catch (error) {
                    console.error('❌ SUBTITLE ERROR: Soft subtitle addition failed:', error);
                    // Fallback: just copy the original video
                    fs.copyFileSync(videoPath, outputVideoPath);
                    result.videoWithSubtitles = outputVideoPath;
                    console.log('🔧 SUBTITLE FALLBACK: Original video copied without subtitles');
                }
            } else {
                console.log('🔍 SUBTITLE DEBUG: Step 7.3b - Burning hard subtitles (this may take 2-5 minutes)...');
                console.log('⏰ SUBTITLE INFO: Please wait, FFmpeg is processing your video...');
                
                try {
                    await burnSubtitlesIntoVideo(videoPath, subtitlePath, outputVideoPath, styling);
                    console.log('✅ SUBTITLE DEBUG: Step 7.3b complete - Hard subtitles burned');
                    result.videoWithSubtitles = outputVideoPath;
                } catch (error) {
                    console.error('❌ SUBTITLE ERROR: Hard subtitle burning failed:', error);
                    // Fallback: try soft subtitles
                    console.log('🔧 SUBTITLE FALLBACK: Trying soft subtitles instead...');
                    try {
                        await addSoftSubtitles(videoPath, subtitlePath, outputVideoPath);
                        console.log('✅ SUBTITLE FALLBACK: Soft subtitles added successfully');
                        result.videoWithSubtitles = outputVideoPath;
                    } catch (fallbackError) {
                        console.error('❌ SUBTITLE ERROR: Both hard and soft subtitle methods failed');
                        // Final fallback: just copy original video
                        fs.copyFileSync(videoPath, outputVideoPath);
                        result.videoWithSubtitles = outputVideoPath;
                        console.log('🔧 SUBTITLE FINAL FALLBACK: Original video copied');
                    }
                }
            }
            
            console.log('✅ SUBTITLE DEBUG: Step 7.3 complete - Video processing finished');
        } else {
            console.log('🔍 SUBTITLE DEBUG: Skipping video processing (addToVideo=false or no videoPath)');
        }

        console.log('✅ SUBTITLE DEBUG: processSubtitles completed successfully');
        return result;

    } catch (error) {
        console.error('💥 SUBTITLE ERROR: processSubtitles failed:', error);
        console.error('💥 SUBTITLE ERROR: Stack trace:', error.stack);
        throw error;
    }
};

module.exports = {
    convertScriptToSRT,
    convertScriptToVTT,
    createSmartSubtitles,
    saveSubtitleFile,
    burnSubtitlesIntoVideo,
    addSoftSubtitles,
    processSubtitles
}; 