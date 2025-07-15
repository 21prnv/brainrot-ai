const fs = require('fs');
const path = require('path');
const config = require('../config/config');

/**
 * Ensure all required storage directories exist
 */
const initializeStorage = () => {
    const directories = [
        config.upload.uploadDir,
        config.upload.processedDir,
        config.upload.tempDir,
        config.upload.framesDir,
        config.upload.audioDir,
        path.join(__dirname, '..', 'data')
    ];

    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Created directory: ${dir}`);
        }
    });
};

/**
 * Clean up temporary files older than specified hours
 * @param {number} hours - Hours to keep files
 * @returns {number} Number of files cleaned up
 */
const cleanupTempFiles = (hours = 24) => {
    const tempDir = config.upload.tempDir;
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    let cleanedCount = 0;

    if (!fs.existsSync(tempDir)) {
        return cleanedCount;
    }

    const files = fs.readdirSync(tempDir);
    
    files.forEach(file => {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtimeMs < cutoffTime) {
            try {
                fs.unlinkSync(filePath);
                cleanedCount++;
            } catch (error) {
                console.error('Error deleting temp file:', error);
            }
        }
    });

    return cleanedCount;
};

/**
 * Get storage statistics
 * @returns {object} Storage statistics
 */
const getStorageStats = () => {
    const directories = [
        { name: 'uploads', path: config.upload.uploadDir },
        { name: 'processed', path: config.upload.processedDir },
        { name: 'temp', path: config.upload.tempDir },
        { name: 'frames', path: config.upload.framesDir },
        { name: 'audio', path: config.upload.audioDir }
    ];

    const stats = {
        total: 0,
        directories: {}
    };

    directories.forEach(dir => {
        if (fs.existsSync(dir.path)) {
            const dirStats = getDirStats(dir.path);
            stats.directories[dir.name] = dirStats;
            stats.total += dirStats.size;
        } else {
            stats.directories[dir.name] = { size: 0, files: 0 };
        }
    });

    return stats;
};

/**
 * Get directory statistics
 * @param {string} dirPath - Directory path
 * @returns {object} Directory statistics
 */
const getDirStats = (dirPath) => {
    let totalSize = 0;
    let fileCount = 0;

    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
            totalSize += stats.size;
            fileCount++;
        } else if (stats.isDirectory()) {
            const subStats = getDirStats(filePath);
            totalSize += subStats.size;
            fileCount += subStats.files;
        }
    });

    return { size: totalSize, files: fileCount };
};

/**
 * Create a unique file path
 * @param {string} originalName - Original file name
 * @param {string} directory - Target directory
 * @returns {string} Unique file path
 */
const createUniqueFilePath = (originalName, directory) => {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    
    return path.join(directory, `${baseName}_${timestamp}_${randomSuffix}${ext}`);
};

/**
 * Safe file deletion
 * @param {string} filePath - File path to delete
 * @returns {boolean} Success status
 */
const safeDelete = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
};

/**
 * Safe directory deletion
 * @param {string} dirPath - Directory path to delete
 * @returns {boolean} Success status
 */
const safeDeleteDir = (dirPath) => {
    try {
        if (fs.existsSync(dirPath)) {
            fs.rmSync(dirPath, { recursive: true, force: true });
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting directory:', error);
        return false;
    }
};

/**
 * Copy file to destination
 * @param {string} sourcePath - Source file path
 * @param {string} destPath - Destination file path
 * @returns {boolean} Success status
 */
const copyFile = (sourcePath, destPath) => {
    try {
        // Ensure destination directory exists
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        fs.copyFileSync(sourcePath, destPath);
        return true;
    } catch (error) {
        console.error('Error copying file:', error);
        return false;
    }
};

/**
 * Move file to destination
 * @param {string} sourcePath - Source file path
 * @param {string} destPath - Destination file path
 * @returns {boolean} Success status
 */
const moveFile = (sourcePath, destPath) => {
    try {
        // Ensure destination directory exists
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        fs.renameSync(sourcePath, destPath);
        return true;
    } catch (error) {
        console.error('Error moving file:', error);
        return false;
    }
};

/**
 * Get file size in human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Human-readable size
 */
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Validate file type
 * @param {string} filePath - File path
 * @param {string[]} allowedTypes - Allowed MIME types
 * @returns {boolean} Valid status
 */
const validateFileType = (filePath, allowedTypes) => {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypeMap = {
        '.mp4': 'video/mp4',
        '.avi': 'video/avi',
        '.mov': 'video/mov',
        '.mkv': 'video/mkv',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav'
    };

    const mimeType = mimeTypeMap[ext];
    return mimeType && allowedTypes.includes(mimeType);
};

module.exports = {
    initializeStorage,
    cleanupTempFiles,
    getStorageStats,
    getDirStats,
    createUniqueFilePath,
    safeDelete,
    safeDeleteDir,
    copyFile,
    moveFile,
    formatFileSize,
    validateFileType
}; 