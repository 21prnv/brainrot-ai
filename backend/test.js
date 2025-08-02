#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to find video files in current directory
function findVideoFiles() {
    const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'];
    const files = fs.readdirSync('.');
    
    return files.filter(file => 
        videoExtensions.some(ext => file.toLowerCase().endsWith(ext))
    );
}

// Function to escape text for ffmpeg
function escapeText(text) {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/:/g, '\\:')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        .replace(/!/g, '\\!')
        .replace(/\?/g, '\\?')
        .replace(/\./g, '\\.')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/\|/g, '\\|')
        .replace(/&/g, '\\&')
        .replace(/%/g, '\\%')
        .replace(/\$/g, '\\$')
        .replace(/#/g, '\\#')
        .replace(/@/g, '\\@')
        .replace(/\+/g, '\\+')
        .replace(/=/g, '\\=')
        .replace(/"/g, '\\"')
        .replace(/`/g, '\\`')
        .replace(/~/g, '\\~')
        .replace(/\^/g, '\\^')
        .replace(/\*/g, '\\*')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/</g, '\\<')
        .replace(/>/g, '\\>');
}

// Function to add subtitle to video
function addSubtitleToVideo(videoPath, subtitleText, outputPath) {
    const escapedText = escapeText(subtitleText);
    
    // FFmpeg command to add text overlay at bottom with bold-looking white text
    const command = `ffmpeg -i "${videoPath}" -vf "drawtext=text='${escapedText}':fontfile=/System/Library/Fonts/Arial.ttf:fontsize=28:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-th-15" -codec:a copy "${outputPath}"`;
    
    // Alternative command for systems without Arial.ttf (Linux/Windows) - using bold-like styling
    const alternativeCommand = `ffmpeg -i "${videoPath}" -vf "drawtext=text='${escapedText}':fontsize=28:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-th-15" -codec:a copy "${outputPath}"`;
    
    try {
        console.log('Adding subtitle to video...');
        console.log(`Input: ${videoPath}`);
        console.log(`Output: ${outputPath}`);
        console.log(`Subtitle: ${subtitleText}`);
        console.log(`Video duration: 11 seconds`);
        
        try {
            execSync(command, { stdio: 'inherit' });
        } catch (error) {
            console.log('Trying alternative font configuration...');
            execSync(alternativeCommand, { stdio: 'inherit' });
        }
        
        console.log('✅ Subtitle added successfully!');
        
    } catch (error) {
        console.error('❌ Error adding subtitle:', error.message);
        console.log('\nMake sure ffmpeg is installed and accessible from command line.');
        console.log('Install ffmpeg: https://ffmpeg.org/download.html');
    }
}

// Main function
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('📹 Video Subtitle Generator');
        console.log('Usage: node subtitle.js "Your subtitle text here" [video-file] [output-file]');
        console.log('\nOptions:');
        console.log('  "text"      - The subtitle text (required)');
        console.log('  video-file  - Input video file (optional, will auto-detect if not provided)');
        console.log('  output-file - Output video file (optional, defaults to input_with_subtitle.ext)');
        console.log('\nExamples:');
        console.log('  node subtitle.js "Hello World"');
        console.log('  node subtitle.js "My Title" video.mp4');
        console.log('  node subtitle.js "Custom Text" input.mp4 output.mp4');
        return;
    }
    
    const subtitleText = args[0];
    let videoFile = args[1];
    let outputFile = args[2];
    
    // Auto-detect video file if not provided
    if (!videoFile) {
        const videoFiles = findVideoFiles();
        
        if (videoFiles.length === 0) {
            console.error('❌ No video files found in current directory');
            console.log('Supported formats: .mp4, .avi, .mov, .mkv, .wmv, .flv, .webm');
            return;
        }
        
        if (videoFiles.length === 1) {
            videoFile = videoFiles[0];
            console.log(`📁 Auto-detected video file: ${videoFile}`);
        } else {
            console.log('📁 Multiple video files found:');
            videoFiles.forEach((file, index) => {
                console.log(`  ${index + 1}. ${file}`);
            });
            console.log('\nPlease specify which video file to use:');
            console.log(`node subtitle.js "${subtitleText}" filename.ext`);
            return;
        }
    }
    
    // Check if video file exists
    if (!fs.existsSync(videoFile)) {
        console.error(`❌ Video file not found: ${videoFile}`);
        return;
    }
    
    // Generate output filename if not provided
    if (!outputFile) {
        const ext = path.extname(videoFile);
        const name = path.basename(videoFile, ext);
        outputFile = `${name}_with_subtitle${ext}`;
    }
    
    // Check if output file already exists
    if (fs.existsSync(outputFile)) {
        console.log(`⚠️  Output file already exists: ${outputFile}`);
        console.log('The existing file will be overwritten.');
    }
    
    // Add subtitle to video
    addSubtitleToVideo(videoFile, subtitleText, outputFile);
}

// Run the script
main();