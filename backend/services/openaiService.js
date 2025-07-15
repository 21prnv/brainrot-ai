const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: config.openai.apiKey,
});

/**
 * Convert image to base64 string
 * @param {string} imagePath - Path to the image file
 * @returns {string} Base64 encoded image
 */
const imageToBase64 = (imagePath) => {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
};

/**
 * Generate script from video frames using GPT-4o Vision
 * @param {string[]} framePaths - Array of frame file paths
 * @param {string} prompt - User's custom prompt
 * @param {string} style - Script style (casual, professional, humorous, etc.)
 * @returns {Promise<object>} Generated script data
 */
const generateScript = async (framePaths, prompt = '', style = 'casual') => {
    try {
        if (!framePaths || framePaths.length === 0) {
            throw new Error('No frames provided for script generation');
        }

        // Prepare images for OpenAI API
        const images = framePaths.map(framePath => {
            const base64Image = imageToBase64(framePath);
            const mimeType = path.extname(framePath).toLowerCase() === '.jpg' ? 'image/jpeg' : 'image/png';
            
            return {
                type: 'image_url',
                image_url: {
                    url: `data:${mimeType};base64,${base64Image}`
                }
            };
        });

        // Create system prompt based on style
        const systemPrompts = {
            casual: "You are a creative content creator who writes engaging, casual scripts for short videos. Make it conversational and relatable.",
            professional: "You are a professional scriptwriter who creates polished, informative scripts for business content.",
            humorous: "You are a comedy writer who creates funny, entertaining scripts that make people laugh.",
            educational: "You are an educational content creator who writes clear, informative scripts that teach viewers something new.",
            motivational: "You are a motivational speaker who creates inspiring, uplifting scripts that motivate viewers."
        };

        const systemPrompt = systemPrompts[style] || systemPrompts.casual;

        // Create user prompt
        let userPrompt = `Analyze these video frames and create an engaging script for a short video. `;
        
        if (prompt) {
            userPrompt += `The user wants: ${prompt}. `;
        }
        
        userPrompt += `
        
Requirements:
- Write a script that would take 30-60 seconds to read aloud
- Make it engaging and suitable for social media
- Include natural pauses and emphasis points
- Don't describe what's happening in the frames, instead create a narrative script
- Make sure it flows naturally when spoken
- Style: ${style}

Please format your response as a JSON object with the following structure:
{
  "script": "Your script here...",
  "title": "Suggested video title",
  "description": "Brief description of what the video should convey",
  "estimatedDuration": "estimated seconds to read aloud",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "tone": "description of the tone used"
}`;

        // Make API request to OpenAI
        const response = await openai.chat.completions.create({
            model: config.openai.model,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: userPrompt
                        },
                        ...images
                    ]
                }
            ],
            max_tokens: config.openai.maxTokens,
            temperature: 0.7
        });

        const content = response.choices[0].message.content;
        
        // Try to parse as JSON, fallback to plain text
        let scriptData;
        try {
            scriptData = JSON.parse(content);
        } catch (jsonError) {
            // If JSON parsing fails, create a structured response
            scriptData = {
                script: content,
                title: "Generated Video Script",
                description: "AI-generated script based on video frames",
                estimatedDuration: "45-60 seconds",
                keyPoints: ["Engaging content", "Natural flow", "Social media optimized"],
                tone: style
            };
        }

        return {
            success: true,
            data: scriptData,
            usage: {
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
                totalTokens: response.usage.total_tokens
            }
        };

    } catch (error) {
        console.error('OpenAI script generation error:', error);
        throw new Error(`Failed to generate script: ${error.message}`);
    }
};

/**
 * Improve or modify an existing script
 * @param {string} originalScript - The original script text
 * @param {string} userFeedback - User's feedback for improvement
 * @param {string} style - Script style
 * @returns {Promise<object>} Improved script data
 */
const improveScript = async (originalScript, userFeedback, style = 'casual') => {
    try {
        const systemPrompt = `You are a skilled script editor who improves video scripts based on user feedback. Maintain the core message while incorporating the requested changes.`;

        const userPrompt = `Please improve this script based on the feedback provided:

Original Script: "${originalScript}"

User Feedback: "${userFeedback}"

Style: ${style}

Please provide an improved version formatted as JSON:
{
  "script": "Your improved script here...",
  "changes": ["change 1", "change 2"],
  "improvementSummary": "Brief summary of what was improved"
}`;

        const response = await openai.chat.completions.create({
            model: config.openai.model,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: userPrompt
                }
            ],
            max_tokens: config.openai.maxTokens,
            temperature: 0.7
        });

        const content = response.choices[0].message.content;
        
        let improvedData;
        try {
            improvedData = JSON.parse(content);
        } catch (jsonError) {
            improvedData = {
                script: content,
                changes: ["Content improved based on feedback"],
                improvementSummary: "Script updated according to user request"
            };
        }

        return {
            success: true,
            data: improvedData,
            usage: {
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
                totalTokens: response.usage.total_tokens
            }
        };

    } catch (error) {
        console.error('OpenAI script improvement error:', error);
        throw new Error(`Failed to improve script: ${error.message}`);
    }
};

/**
 * Generate a title and description for a video
 * @param {string} script - The video script
 * @param {string} style - Content style
 * @returns {Promise<object>} Generated title and description
 */
const generateTitleAndDescription = async (script, style = 'casual') => {
    try {
        const userPrompt = `Based on this video script, generate an engaging title and description:

Script: "${script}"

Style: ${style}

Please format as JSON:
{
  "title": "Catchy video title",
  "description": "Engaging description for social media",
  "hashtags": ["#tag1", "#tag2", "#tag3"],
  "hook": "Opening hook to grab attention"
}`;

        const response = await openai.chat.completions.create({
            model: config.openai.model,
            messages: [
                {
                    role: 'user',
                    content: userPrompt
                }
            ],
            max_tokens: 300,
            temperature: 0.8
        });

        const content = response.choices[0].message.content;
        
        let titleData;
        try {
            titleData = JSON.parse(content);
        } catch (jsonError) {
            titleData = {
                title: "Engaging Video Content",
                description: "Check out this amazing video!",
                hashtags: ["#video", "#content", "#ai"],
                hook: "You won't believe what happens next!"
            };
        }

        return {
            success: true,
            data: titleData
        };

    } catch (error) {
        console.error('OpenAI title generation error:', error);
        throw new Error(`Failed to generate title: ${error.message}`);
    }
};

module.exports = {
    generateScript,
    improveScript,
    generateTitleAndDescription
}; 