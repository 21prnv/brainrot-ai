module.exports = {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // API Keys
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4o',
        maxTokens: 1000
    },
    
    elevenlabs: {
        apiKey: process.env.ELEVENLABS_API_KEY,
        voiceId: process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB', // Default voice
        model: process.env.ELEVENLABS_MODEL || 'eleven_monolingual_v1'
    },
    
    // File handling
    upload: {
        maxSize: 100 * 1024 * 1024, // 100MB
        allowedMimeTypes: ['video/mp4', 'video/avi', 'video/mov', 'video/mkv'],
        uploadDir: './storage/uploads',
        processedDir: './storage/processed',
        tempDir: './storage/temp',
        framesDir: './storage/frames',
        audioDir: './storage/audio'
    },
    
    // FFmpeg settings
    ffmpeg: {
        frameRate: 1/3, // Extract 1 frame every 3 seconds
        maxFrames: 10,
        audioFormat: 'mp3',
        audioBitrate: '128k'
    },
    
    // Rate limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        videoProcessingMax: 5 // max 5 video processing requests per window
    },
    
    // CORS
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
    }
}; 