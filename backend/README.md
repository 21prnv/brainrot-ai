# Brainrot AI Backend

A modular Express.js backend for the AI-powered short video enhancer system. This backend handles video uploads, frame extraction, script generation using OpenAI GPT-4o, text-to-speech with ElevenLabs, video/audio merging, and **subtitle generation**.

## 🏗️ Architecture

### Modular Structure
```
backend/
├── config/
│   └── config.js              # Configuration management
├── controllers/
│   ├── videoController.js     # Video processing controller
│   └── subtitleController.js  # Subtitle processing controller
├── middleware/
│   ├── errorHandler.js        # Error handling middleware
│   ├── notFound.js           # 404 handler
│   ├── uploadMiddleware.js   # File upload handling
│   └── validation.js         # Request validation
├── models/
│   └── videoModel.js         # Data persistence layer
├── routes/
│   ├── healthRoutes.js       # Health check endpoints
│   ├── videoRoutes.js        # Video processing endpoints
│   └── subtitleRoutes.js     # Subtitle processing endpoints
├── services/
│   ├── elevenlabsService.js  # ElevenLabs TTS integration
│   ├── ffmpegService.js      # Video processing with FFmpeg
│   ├── openaiService.js      # OpenAI GPT-4o integration
│   └── subtitleService.js    # Subtitle generation & processing
├── utils/
│   ├── responseUtils.js      # Standardized API responses
│   └── storageUtils.js       # File system utilities
├── data/                     # JSON data storage
├── storage/                  # File storage
│   ├── uploads/             # Original video uploads
│   ├── frames/              # Extracted video frames
│   ├── audio/               # Generated audio files
│   ├── processed/           # Final processed videos
│   └── temp/                # Temporary files
└── server.js                # Main server entry point
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- FFmpeg installed on your system
- OpenAI API key
- ElevenLabs API key

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## 🔧 Configuration

### Environment Variables
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend URL for CORS
- `OPENAI_API_KEY` - OpenAI API key
- `ELEVENLABS_API_KEY` - ElevenLabs API key
- `ELEVENLABS_VOICE_ID` - Default voice ID
- `ELEVENLABS_MODEL` - TTS model to use

### File Storage
- `MAX_FILE_SIZE` - Maximum upload size (100MB)
- `UPLOAD_DIR` - Upload directory
- `PROCESSED_DIR` - Processed files directory
- `TEMP_DIR` - Temporary files directory
- `FRAMES_DIR` - Video frames directory
- `AUDIO_DIR` - Audio files directory

## 📡 API Endpoints

### Video Processing
- `POST /api/videos/upload` - Upload video
- `POST /api/videos/process/:videoId` - Process video
- `GET /api/videos/status/:videoId` - Get processing status
- `GET /api/videos/download/:videoId` - Download processed video
- `GET /api/videos/frames/:videoId` - Get extracted frames
- `GET /api/videos/script/:videoId` - Get generated script
- `PUT /api/videos/script/:videoId` - Update script
- `POST /api/videos/audio/:videoId` - Generate audio
- `GET /api/videos/list` - List all videos
- `DELETE /api/videos/:videoId` - Delete video

### Subtitle Processing
- `POST /api/subtitles/generate` - Generate subtitles from script
- `POST /api/subtitles/add-to-video/:videoId` - Add subtitles to existing video
- `POST /api/subtitles/process` - Upload video and generate subtitles with script
- `GET /api/subtitles/download/:videoId` - Download subtitle file
- `GET /api/subtitles/content/:videoId` - Get subtitle content
- `PUT /api/subtitles/timing/:videoId` - Update subtitle timing

### Health Check
- `GET /api/health` - Health check endpoint

## 🔄 Processing Flow

### Standard Video Processing
1. **Video Upload** - User uploads video file
2. **Frame Extraction** - Extract frames using FFmpeg
3. **Script Generation** - Generate script using OpenAI GPT-4o Vision
4. **Audio Generation** - Convert script to speech using ElevenLabs
5. **Video Merging** - Merge original video with new audio using FFmpeg

### Subtitle Processing Flow
1. **Script Generation** - Generate or receive video script
2. **Subtitle Creation** - Convert script to SRT/VTT format with smart timing
3. **Video Processing** - Add subtitles to video (hard-burned or soft)

## 🛠️ Services

### FFmpeg Service (`services/ffmpegService.js`)
- Extract frames from video
- Get video metadata and duration
- Merge video with audio
- Convert audio formats
- Add text overlays

### OpenAI Service (`services/openaiService.js`)
- Generate scripts from video frames
- Improve existing scripts
- Generate titles and descriptions
- Support multiple content styles

### ElevenLabs Service (`services/elevenlabsService.js`)
- Text-to-speech conversion
- Voice management
- Custom voice settings
- Audio streaming
- Speech-to-speech conversion

### Subtitle Service (`services/subtitleService.js`) ⭐ NEW
- Convert scripts to SRT/VTT formats
- Smart timing based on word count
- Burn subtitles into video (hard subtitles)
- Add soft subtitles as separate tracks
- Custom styling options

### Video Model (`models/videoModel.js`)
- File-based data persistence
- CRUD operations
- Status tracking
- Processing stages management
- Statistics and analytics

## 🧰 Utilities

### Storage Utils (`utils/storageUtils.js`)
- Directory management
- File operations
- Cleanup utilities
- Storage statistics
- File validation

### Response Utils (`utils/responseUtils.js`)
- Standardized API responses
- Error handling
- Pagination
- File downloads
- Status codes

## 🔒 Security Features

- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - API rate limiting
- **File Validation** - Upload validation
- **Input Sanitization** - Request validation with Joi

## 🎯 Processing Stages

Each video goes through these stages:
1. `upload` - File uploaded successfully
2. `frameExtraction` - Frames extracted from video
3. `scriptGeneration` - Script generated from frames
4. `audioGeneration` - Audio created from script
5. `videoMerging` - Final video with new audio created
6. `subtitleGeneration` - Subtitles created and added ⭐ NEW

## 🔍 Monitoring

- Request logging with Morgan
- Error tracking
- Processing status updates
- Storage usage monitoring
- Performance metrics

## 📊 Data Models

### Video Record Structure
```javascript
{
  id: "uuid",
  originalName: "video.mp4",
  filePath: "/uploads/video.mp4",
  fileSize: 12345678,
  mimeType: "video/mp4",
  status: "processing",
  uploadedAt: "2024-01-01T00:00:00Z",
  prompt: "Make it engaging",
  style: "casual",
  voice: "voice_id",
  frames: ["/frames/frame_001.jpg"],
  script: { script: "...", title: "..." },
  audioPath: "/audio/audio.mp3",
  processedVideoPath: "/processed/final.mp4",
  
  // NEW: Subtitle fields
  subtitlePath: "/processed/subtitles.srt",
  subtitleFormat: "srt",
  subtitleType: "hard",
  
  duration: 30.5,
  metadata: {},
  processedAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  stages: {
    upload: { completed: true, completedAt: "..." },
    frameExtraction: { completed: true, completedAt: "..." },
    scriptGeneration: { completed: true, completedAt: "..." },
    audioGeneration: { completed: true, completedAt: "..." },
    videoMerging: { completed: false, completedAt: null },
    subtitleGeneration: { completed: false, completedAt: null } // NEW
  }
}
```

## 🎬 Subtitle Features

### Supported Formats
- **SRT (SubRip)** - Most widely supported
- **WebVTT** - Web standard, HTML5 compatible

### Subtitle Types
- **Hard Subtitles** - Burned into video, always visible
- **Soft Subtitles** - Separate track, can be toggled on/off

### Smart Timing
- Word count-based duration calculation
- Reading speed optimization (180 WPM)
- Natural sentence breaks
- Automatic gap management

### Styling Options
- Font size (16-48px)
- Font color (white, black, yellow, red)
- Position (top, center, bottom)
- Outline and background
- Custom font families

## 🐛 Error Handling

- Comprehensive error middleware
- Structured error responses
- Development vs production error details
- Logging and monitoring
- Graceful failure handling

## 🔄 Development

### Scripts
- `npm run dev` - Development with nodemon
- `npm start` - Production server
- `npm test` - Run tests

### Code Organization
- **Controllers** - Handle HTTP requests/responses
- **Services** - Business logic and external API integration
- **Models** - Data access and persistence
- **Middleware** - Request processing and validation
- **Utils** - Reusable utility functions
- **Config** - Configuration management

## 📈 Performance

- Compression middleware
- Efficient file handling
- Streaming support
- Memory optimization
- Cleanup routines

## 🧪 Testing

- Unit tests for services
- Integration tests for controllers
- API endpoint testing
- Error scenario testing
- Performance testing

## 🚀 Deployment

- Production configuration
- Environment variable management
- Log management
- Process monitoring
- Scaling considerations

## 📝 Contributing

1. Follow the modular architecture
2. Add proper error handling
3. Include comprehensive tests
4. Update documentation
5. Follow code style guidelines

## 🔧 Troubleshooting

### Common Issues
- FFmpeg not found: Install FFmpeg and set path
- API key errors: Check environment variables
- File upload fails: Check file size and permissions
- Processing stuck: Check service logs
- Subtitle generation fails: Check script format and video duration

### Logs
- Request logs: Morgan middleware
- Error logs: Error handler middleware
- Service logs: Individual service logging
- Debug logs: Development environment

## 📄 License

MIT License - See LICENSE file for details 