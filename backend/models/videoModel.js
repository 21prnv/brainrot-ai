const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Data storage file
const DATA_FILE = path.join(__dirname, '..', 'data', 'videos.json');

// Ensure data directory exists
const ensureDataDirectory = () => {
    const dataDir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
};

// Initialize data file if it doesn't exist
const initializeDataFile = () => {
    ensureDataDirectory();
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({}));
    }
};

// Read data from file
const readData = () => {
    try {
        initializeDataFile();
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data file:', error);
        return {};
    }
};

// Write data to file
const writeData = (data) => {
    try {
        ensureDataDirectory();
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing data file:', error);
        throw error;
    }
};

/**
 * Create a new video record
 * @param {object} videoData - Video data object
 * @returns {object} Created video record
 */
const create = (videoData) => {
    try {
        const data = readData();
        const id = videoData.id || uuidv4();
        
        const newVideo = {
            id,
            originalName: videoData.originalName,
            filePath: videoData.filePath,
            fileSize: videoData.fileSize,
            mimeType: videoData.mimeType,
            status: videoData.status || 'uploaded',
            uploadedAt: videoData.uploadedAt || new Date().toISOString(),
            prompt: videoData.prompt || '',
            style: videoData.style || 'casual',
            voice: videoData.voice || null,
            
            // Processing data
            frames: videoData.frames || [],
            script: videoData.script || null,
            audioPath: videoData.audioPath || null,
            processedVideoPath: videoData.processedVideoPath || null,
            
            // Metadata
            duration: videoData.duration || null,
            metadata: videoData.metadata || {},
            
            // Timestamps
            processedAt: videoData.processedAt || null,
            updatedAt: new Date().toISOString(),
            
            // Processing stages
            stages: videoData.stages || {
                upload: { completed: true, completedAt: new Date().toISOString() },
                frameExtraction: { completed: false, completedAt: null },
                scriptGeneration: { completed: false, completedAt: null },
                audioGeneration: { completed: false, completedAt: null },
                videoMerging: { completed: false, completedAt: null }
            }
        };

        data[id] = newVideo;
        writeData(data);
        
        return newVideo;
    } catch (error) {
        console.error('Error creating video record:', error);
        throw error;
    }
};

/**
 * Find a video by ID
 * @param {string} id - Video ID
 * @returns {object|null} Video record or null if not found
 */
const findById = (id) => {
    try {
        const data = readData();
        return data[id] || null;
    } catch (error) {
        console.error('Error finding video by ID:', error);
        return null;
    }
};

/**
 * Update a video record
 * @param {string} id - Video ID
 * @param {object} updates - Updates to apply
 * @returns {object|null} Updated video record or null if not found
 */
const update = (id, updates) => {
    try {
        const data = readData();
        
        if (!data[id]) {
            return null;
        }

        // Merge updates with existing data
        data[id] = {
            ...data[id],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        writeData(data);
        return data[id];
    } catch (error) {
        console.error('Error updating video record:', error);
        throw error;
    }
};

/**
 * Update video status
 * @param {string} id - Video ID
 * @param {string} status - New status
 * @returns {object|null} Updated video record or null if not found
 */
const updateStatus = (id, status) => {
    return update(id, { status });
};

/**
 * Update processing stage
 * @param {string} id - Video ID
 * @param {string} stage - Stage name
 * @param {boolean} completed - Whether stage is completed
 * @returns {object|null} Updated video record or null if not found
 */
const updateStage = (id, stage, completed) => {
    try {
        const video = findById(id);
        if (!video) {
            return null;
        }

        const stages = { ...video.stages };
        stages[stage] = {
            completed,
            completedAt: completed ? new Date().toISOString() : null
        };

        return update(id, { stages });
    } catch (error) {
        console.error('Error updating video stage:', error);
        throw error;
    }
};

/**
 * Delete a video record
 * @param {string} id - Video ID
 * @returns {boolean} True if deleted, false if not found
 */
const deleteById = (id) => {
    try {
        const data = readData();
        
        if (!data[id]) {
            return false;
        }

        delete data[id];
        writeData(data);
        return true;
    } catch (error) {
        console.error('Error deleting video record:', error);
        throw error;
    }
};

/**
 * Find all videos
 * @returns {object[]} Array of video records
 */
const findAll = () => {
    try {
        const data = readData();
        return Object.values(data);
    } catch (error) {
        console.error('Error finding all videos:', error);
        return [];
    }
};

/**
 * Find videos by status
 * @param {string} status - Status to filter by
 * @returns {object[]} Array of video records
 */
const findByStatus = (status) => {
    try {
        const data = readData();
        return Object.values(data).filter(video => video.status === status);
    } catch (error) {
        console.error('Error finding videos by status:', error);
        return [];
    }
};

/**
 * Find videos uploaded within a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {object[]} Array of video records
 */
const findByDateRange = (startDate, endDate) => {
    try {
        const data = readData();
        return Object.values(data).filter(video => {
            const uploadedAt = new Date(video.uploadedAt);
            return uploadedAt >= startDate && uploadedAt <= endDate;
        });
    } catch (error) {
        console.error('Error finding videos by date range:', error);
        return [];
    }
};

/**
 * Get video count
 * @returns {number} Total number of videos
 */
const count = () => {
    try {
        const data = readData();
        return Object.keys(data).length;
    } catch (error) {
        console.error('Error counting videos:', error);
        return 0;
    }
};

/**
 * Get video statistics
 * @returns {object} Statistics object
 */
const getStatistics = () => {
    try {
        const data = readData();
        const videos = Object.values(data);
        
        const stats = {
            total: videos.length,
            byStatus: {},
            totalFileSize: 0,
            averageFileSize: 0,
            processingStages: {
                upload: 0,
                frameExtraction: 0,
                scriptGeneration: 0,
                audioGeneration: 0,
                videoMerging: 0
            }
        };

        videos.forEach(video => {
            // Count by status
            stats.byStatus[video.status] = (stats.byStatus[video.status] || 0) + 1;
            
            // Calculate file sizes
            stats.totalFileSize += video.fileSize || 0;
            
            // Count processing stages
            Object.keys(stats.processingStages).forEach(stage => {
                if (video.stages[stage]?.completed) {
                    stats.processingStages[stage]++;
                }
            });
        });

        // Calculate average file size
        stats.averageFileSize = stats.total > 0 ? stats.totalFileSize / stats.total : 0;

        return stats;
    } catch (error) {
        console.error('Error getting video statistics:', error);
        return null;
    }
};

/**
 * Clean up old video records (older than specified days)
 * @param {number} days - Number of days to keep
 * @returns {number} Number of records cleaned up
 */
const cleanup = (days = 30) => {
    try {
        const data = readData();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        let cleanedCount = 0;
        
        Object.keys(data).forEach(id => {
            const video = data[id];
            const uploadedAt = new Date(video.uploadedAt);
            
            if (uploadedAt < cutoffDate) {
                delete data[id];
                cleanedCount++;
            }
        });

        if (cleanedCount > 0) {
            writeData(data);
        }

        return cleanedCount;
    } catch (error) {
        console.error('Error cleaning up video records:', error);
        throw error;
    }
};

module.exports = {
    create,
    findById,
    update,
    updateStatus,
    updateStage,
    deleteById,
    findAll,
    findByStatus,
    findByDateRange,
    count,
    getStatistics,
    cleanup
}; 