const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

// ElevenLabs API configuration
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

/**
 * Get available voices from ElevenLabs
 * @returns {Promise<Array>} Array of available voices
 */
const getAvailableVoices = async () => {
    try {
        const response = await axios.get(`${ELEVENLABS_API_URL}/voices`, {
            headers: {
                'xi-api-key': config.elevenlabs.apiKey
            }
        });

        return {
            success: true,
            data: response.data.voices.map(voice => ({
                id: voice.voice_id,
                name: voice.name,
                category: voice.category,
                description: voice.description,
                previewUrl: voice.preview_url,
                labels: voice.labels
            }))
        };
    } catch (error) {
        console.error('ElevenLabs voices error:', error);
        throw new Error(`Failed to get voices: ${error.message}`);
    }
};

/**
 * Generate audio from text using ElevenLabs TTS
 * @param {string} text - Text to convert to speech
 * @param {string} voiceId - Voice ID to use (optional, uses default if not provided)
 * @param {string} outputPath - Path to save the audio file
 * @param {object} options - Additional options
 * @returns {Promise<object>} Generated audio info
 */
const generateAudio = async (text, voiceId = null, outputPath, options = {}) => {
    try {
        if (!text || text.trim().length === 0) {
            throw new Error('Text is required for audio generation');
        }

        // Use provided voice ID or default from config
        const selectedVoiceId = voiceId || config.elevenlabs.voiceId;

        // Default options
        const {
            model = config.elevenlabs.model,
            stability = 0.5,
            similarityBoost = 0.5,
            style = 0.5,
            speakerBoost = true
        } = options;

        // Prepare request payload
        const payload = {
            text: text,
            model_id: model,
            voice_settings: {
                stability: stability,
                similarity_boost: similarityBoost,
                style: style,
                use_speaker_boost: speakerBoost
            }
        };

        // Make request to ElevenLabs
        const response = await axios.post(
            `${ELEVENLABS_API_URL}/text-to-speech/${selectedVoiceId}`,
            payload,
            {
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': config.elevenlabs.apiKey
                },
                responseType: 'arraybuffer'
            }
        );

        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Save audio file
        fs.writeFileSync(outputPath, response.data);

        // Get file stats
        const stats = fs.statSync(outputPath);

        return {
            success: true,
            data: {
                audioPath: outputPath,
                fileSize: stats.size,
                voiceId: selectedVoiceId,
                model: model,
                textLength: text.length,
                generatedAt: new Date().toISOString()
            }
        };

    } catch (error) {
        console.error('ElevenLabs audio generation error:', error);
        
        // Handle specific API errors
        if (error.response) {
            const { status, data } = error.response;
            
            if (status === 401) {
                throw new Error('Invalid ElevenLabs API key');
            } else if (status === 422) {
                throw new Error('Invalid request parameters');
            } else if (status === 429) {
                throw new Error('Rate limit exceeded. Please try again later.');
            } else {
                throw new Error(`ElevenLabs API error: ${data.message || 'Unknown error'}`);
            }
        }

        throw new Error(`Failed to generate audio: ${error.message}`);
    }
};

/**
 * Generate audio with custom voice settings
 * @param {string} text - Text to convert to speech
 * @param {string} voiceId - Voice ID to use
 * @param {string} outputPath - Path to save the audio file
 * @param {object} voiceSettings - Custom voice settings
 * @returns {Promise<object>} Generated audio info
 */
const generateAudioWithCustomSettings = async (text, voiceId, outputPath, voiceSettings) => {
    const options = {
        stability: voiceSettings.stability || 0.5,
        similarityBoost: voiceSettings.similarity_boost || 0.5,
        style: voiceSettings.style || 0.5,
        speakerBoost: voiceSettings.use_speaker_boost || true
    };

    return generateAudio(text, voiceId, outputPath, options);
};

/**
 * Get voice settings for a specific voice
 * @param {string} voiceId - Voice ID
 * @returns {Promise<object>} Voice settings
 */
const getVoiceSettings = async (voiceId) => {
    try {
        const response = await axios.get(`${ELEVENLABS_API_URL}/voices/${voiceId}/settings`, {
            headers: {
                'xi-api-key': config.elevenlabs.apiKey
            }
        });

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        console.error('ElevenLabs voice settings error:', error);
        throw new Error(`Failed to get voice settings: ${error.message}`);
    }
};

/**
 * Get user's subscription info and usage
 * @returns {Promise<object>} User subscription info
 */
const getUserInfo = async () => {
    try {
        const response = await axios.get(`${ELEVENLABS_API_URL}/user`, {
            headers: {
                'xi-api-key': config.elevenlabs.apiKey
            }
        });

        return {
            success: true,
            data: {
                subscription: response.data.subscription,
                usage: response.data.subscription.character_count,
                limit: response.data.subscription.character_limit,
                resetDate: response.data.subscription.next_character_count_reset_unix
            }
        };
    } catch (error) {
        console.error('ElevenLabs user info error:', error);
        throw new Error(`Failed to get user info: ${error.message}`);
    }
};

/**
 * Stream audio generation for real-time playback
 * @param {string} text - Text to convert to speech
 * @param {string} voiceId - Voice ID to use
 * @param {object} options - Additional options
 * @returns {Promise<Stream>} Audio stream
 */
const streamAudio = async (text, voiceId, options = {}) => {
    try {
        const selectedVoiceId = voiceId || config.elevenlabs.voiceId;
        
        const payload = {
            text: text,
            model_id: options.model || config.elevenlabs.model,
            voice_settings: {
                stability: options.stability || 0.5,
                similarity_boost: options.similarityBoost || 0.5,
                style: options.style || 0.5,
                use_speaker_boost: options.speakerBoost || true
            }
        };

        const response = await axios.post(
            `${ELEVENLABS_API_URL}/text-to-speech/${selectedVoiceId}/stream`,
            payload,
            {
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': config.elevenlabs.apiKey
                },
                responseType: 'stream'
            }
        );

        return response.data;
    } catch (error) {
        console.error('ElevenLabs streaming error:', error);
        throw new Error(`Failed to stream audio: ${error.message}`);
    }
};

/**
 * Convert speech to speech (voice conversion)
 * @param {string} audioPath - Path to input audio file
 * @param {string} voiceId - Target voice ID
 * @param {string} outputPath - Path to save converted audio
 * @returns {Promise<object>} Conversion result
 */
const speechToSpeech = async (audioPath, voiceId, outputPath) => {
    try {
        const audioData = fs.readFileSync(audioPath);
        
        const formData = new FormData();
        formData.append('audio', audioData, path.basename(audioPath));
        formData.append('model_id', config.elevenlabs.model);

        const response = await axios.post(
            `${ELEVENLABS_API_URL}/speech-to-speech/${voiceId}`,
            formData,
            {
                headers: {
                    'Accept': 'audio/mpeg',
                    'xi-api-key': config.elevenlabs.apiKey,
                    ...formData.getHeaders()
                },
                responseType: 'arraybuffer'
            }
        );

        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Save converted audio
        fs.writeFileSync(outputPath, response.data);

        return {
            success: true,
            data: {
                audioPath: outputPath,
                voiceId: voiceId,
                originalPath: audioPath
            }
        };

    } catch (error) {
        console.error('ElevenLabs speech-to-speech error:', error);
        throw new Error(`Failed to convert speech: ${error.message}`);
    }
};

module.exports = {
    getAvailableVoices,
    generateAudio,
    generateAudioWithCustomSettings,
    getVoiceSettings,
    getUserInfo,
    streamAudio,
    speechToSpeech
}; 