"use client";
import { useState } from "react";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: "AIzaSyBj67DtbPmqVeKqn887qtNVcVG3VRORKhw",
});

// Updated prompt with duration parameter
const createPromptWithDuration = (videoDurationSeconds: number) => {
  const minutes = Math.floor(videoDurationSeconds / 60);
  const seconds = Math.floor(videoDurationSeconds % 60);
  const durationDisplay =
    minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  return `
Commentary Script Generator for POV or Action Videos

🧠 Role:
You are a professional commentary scriptwriter. Your job is to watch a video and generate a natural, entertaining, and descriptive commentary that could be used as a voiceover in the final video. This is not a first-person POV narration — this is commentary *about* what's happening.

📌 Objective:
Create a compelling video script that describes the scene, highlights interesting moments, reacts to the people or animals visible, and builds excitement or emotion. This script is meant for viewers to follow along and enjoy the action even without sound.

🎯 CRITICAL TIMING REQUIREMENT:
The video is exactly ${videoDurationSeconds} seconds long (${durationDisplay}). Your script MUST be timed to match this duration exactly. Generate a script that would take approximately ${videoDurationSeconds} seconds to read aloud at a natural speaking pace (roughly 3-4 words per second).

Target word count: ${Math.floor(videoDurationSeconds * 3.5)} words (±10 words)

🎬 Script Style:
- Use third-person narration
- Focus on what's happening in the video, including the behavior and expressions of people, animals, or objects
- Add excitement, suspense, or humor wherever it fits
- Use casual, clear language that feels like a YouTube or TikTok voiceover
- Use present tense for live, energetic feel
- Include natural pauses and breathing points

🛠️ Tone:
- Friendly and engaging
- Occasionally funny, dramatic, or surprised
- Never robotic, formal, or overly descriptive

🧩 Structure (timing-aware):
1. **Intro (${Math.floor(
    videoDurationSeconds * 0.2
  )} seconds)** — Set the scene quickly
2. **Main Commentary (${Math.floor(
    videoDurationSeconds * 0.7
  )} seconds)** — Describe the action, reactions, surprises, and visuals
3. **Outro (${Math.floor(
    videoDurationSeconds * 0.1
  )} seconds)** — Reflect, tease a reaction, or wrap it up

📝 Include:
- Reactions to people: "This kid looks way too confident…"
- Surprises or suspense: "But wait—what's that ahead?"
- Funny or relatable lines: "That splash definitely went up his nose."
- Natural pacing that matches the video rhythm

✅ Example for a 15-second video:

"This kid is stepping into the water slide. It looks innocent… but there's a twist.  
He gives a quick wave — and he's off!  
Zooming down, turning left… now right — the pace is picking up.  
And there it is — the loop!  
He shoots through it like a cannonball. That splash at the end? Brutal.  
And he's laughing like he wants to go again. Legend."

🎤 Output Format:
Only output the final script. No labels, no explanations. The script should flow naturally when read aloud and match the ${videoDurationSeconds}-second video duration exactly.
`;
};

interface ProcessingStep {
  name: string;
  status: "pending" | "processing" | "completed" | "error";
  message?: string;
}

export default function VideoProcessor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string>("");
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string>("");
  const [subtitleOptions, setSubtitleOptions] = useState({
    format: "srt" as "srt" | "vtt",
    subtitleType: "hard" as "hard" | "soft",
    fontSize: 24,
    fontColor: "white",
    position: "bottom" as "bottom" | "top" | "center",
  });
  const [error, setError] = useState<string>("");
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    { name: "Extract Duration", status: "pending" },
    { name: "Generate Script", status: "pending" },
    { name: "Process Subtitles", status: "pending" },
    { name: "Add to Video", status: "pending" },
  ]);

  const updateProcessingStep = (
    stepName: string,
    status: ProcessingStep["status"],
    message?: string
  ) => {
    setProcessingSteps((prev) =>
      prev.map((step) =>
        step.name === stepName ? { ...step, status, message } : step
      )
    );
  };

  // Function to extract video duration
  const extractVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };

      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        reject(new Error("Failed to load video metadata"));
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("video/")) {
      setSelectedFile(file);
      setError("");
      setVideoDuration(null);

      try {
        const duration = await extractVideoDuration(file);
        setVideoDuration(duration);
      } catch (err) {
        setError("Failed to extract video duration. Please try another file.");
        console.error("Duration extraction error:", err);
      }
    }
  };

  const processVideoWithSubtitles = async () => {
    if (!selectedFile) {
      setError("Please select a video file first");
      return;
    }

    if (!videoDuration) {
      setError("Video duration not available. Please reselect the file.");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      // Step 1: Duration already extracted, mark as completed
      updateProcessingStep(
        "Extract Duration",
        "completed",
        `${Math.round(videoDuration)}s`
      );

      // Step 2: Generate script using Google AI with duration-aware prompt
      updateProcessingStep("Generate Script", "processing");

      const uploadedFile = await ai.files.upload({
        file: selectedFile,
        config: { mimeType: selectedFile.type },
      });

      if (!uploadedFile.name) {
        throw new Error("File upload failed - no file name returned");
      }

      let fileStatus = await ai.files.get({ name: uploadedFile.name });
      while (fileStatus.state !== "ACTIVE") {
        if (fileStatus.state === "FAILED") {
          throw new Error("File processing failed");
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
        fileStatus = await ai.files.get({ name: uploadedFile.name });
      }

      const dynamicPrompt = createPromptWithDuration(videoDuration);

      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: createUserContent([
          createPartFromUri(uploadedFile.uri!, uploadedFile.mimeType || ""),
          dynamicPrompt,
        ]),
      });

      const scriptText = (result as any).text || "No response received";
      setGeneratedScript(scriptText);
      updateProcessingStep(
        "Generate Script",
        "completed",
        `${scriptText.split(" ").length} words`
      );

      // Step 3: Process video with subtitles using backend
      updateProcessingStep("Process Subtitles", "processing");

      const formData = new FormData();
      formData.append("video", selectedFile);
      formData.append("script", scriptText);
      formData.append("format", subtitleOptions.format);
      formData.append("subtitleType", subtitleOptions.subtitleType);
      formData.append(
        "styling",
        JSON.stringify({
          fontSize: subtitleOptions.fontSize,
          fontColor: subtitleOptions.fontColor,
          position: subtitleOptions.position,
        })
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes

      const backendResponse = await fetch(
        "http://localhost:5000/api/subtitles/process",
        {
          method: "POST",
          body: formData,
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      console.log(backendResponse);
      if (!backendResponse.ok) {
        throw new Error(
          `Backend processing failed: ${backendResponse.statusText}`
        );
      }

      const backendResult = await backendResponse.json();
      updateProcessingStep("Process Subtitles", "completed");
      updateProcessingStep("Add to Video", "completed");

      // Set the processed video URL for download
      if (backendResult.data.videoWithSubtitles) {
        setProcessedVideoUrl(
          `http://localhost:5000/api/videos/download/${backendResult.data.videoId}`
        );
      }
    } catch (err) {
      console.error("Error processing video:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to process video: ${errorMessage}`);

      // Update failed step
      const currentStep = processingSteps.find(
        (step) => step.status === "processing"
      );
      if (currentStep) {
        updateProcessingStep(currentStep.name, "error", errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const ProcessingStepIndicator = ({ step }: { step: ProcessingStep }) => {
    const getStepIcon = () => {
      switch (step.status) {
        case "completed":
          return <span className="text-green-500">✓</span>;
        case "processing":
          return (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          );
        case "error":
          return <span className="text-red-500">✗</span>;
        default:
          return <span className="text-gray-300">○</span>;
      }
    };

    const getStepColor = () => {
      switch (step.status) {
        case "completed":
          return "text-green-700";
        case "processing":
          return "text-blue-700";
        case "error":
          return "text-red-700";
        default:
          return "text-gray-500";
      }
    };

    return (
      <div className={`flex items-center space-x-2 ${getStepColor()}`}>
        {getStepIcon()}
        <span className="text-sm">{step.name}</span>
        {step.message && (
          <span className="text-xs text-gray-500">- {step.message}</span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Video Script & Subtitle Generator
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Upload & Settings */}
          <div className="space-y-6">
            {/* File Upload */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Upload Video
              </h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Video File
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {selectedFile && (
                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">
                    Selected: {selectedFile.name} (
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                  {videoDuration && (
                    <p className="text-sm text-green-600 mt-1">
                      Duration: {Math.floor(videoDuration / 60)}m{" "}
                      {Math.floor(videoDuration % 60)}s
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Subtitle Options */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Subtitle Options
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Format
                  </label>
                  <select
                    value={subtitleOptions.format}
                    onChange={(e) =>
                      setSubtitleOptions((prev) => ({
                        ...prev,
                        format: e.target.value as "srt" | "vtt",
                      }))
                    }
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="srt">SRT (SubRip)</option>
                    <option value="vtt">WebVTT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subtitle Type
                  </label>
                  <select
                    value={subtitleOptions.subtitleType}
                    onChange={(e) =>
                      setSubtitleOptions((prev) => ({
                        ...prev,
                        subtitleType: e.target.value as "hard" | "soft",
                      }))
                    }
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="hard">Hard (Burned into video)</option>
                    <option value="soft">Soft (Separate track)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Font Size: {subtitleOptions.fontSize}px
                  </label>
                  <input
                    type="range"
                    min="16"
                    max="48"
                    value={subtitleOptions.fontSize}
                    onChange={(e) =>
                      setSubtitleOptions((prev) => ({
                        ...prev,
                        fontSize: parseInt(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Font Color
                  </label>
                  <select
                    value={subtitleOptions.fontColor}
                    onChange={(e) =>
                      setSubtitleOptions((prev) => ({
                        ...prev,
                        fontColor: e.target.value,
                      }))
                    }
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="white">White</option>
                    <option value="black">Black</option>
                    <option value="yellow">Yellow</option>
                    <option value="red">Red</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position
                  </label>
                  <select
                    value={subtitleOptions.position}
                    onChange={(e) =>
                      setSubtitleOptions((prev) => ({
                        ...prev,
                        position: e.target.value as "bottom" | "top" | "center",
                      }))
                    }
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="bottom">Bottom</option>
                    <option value="top">Top</option>
                    <option value="center">Center</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Process Button */}
            <button
              onClick={processVideoWithSubtitles}
              disabled={!selectedFile || !videoDuration || isProcessing}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg font-semibold"
            >
              {isProcessing
                ? "Processing Video..."
                : videoDuration
                ? `Generate ${Math.round(
                    videoDuration
                  )}s Script & Add Subtitles`
                : "Generate Script & Add Subtitles"}
            </button>
          </div>

          {/* Right Column - Results & Progress */}
          <div className="space-y-6">
            {/* Processing Progress */}
            {(isProcessing ||
              processingSteps.some((step) => step.status !== "pending")) && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Processing Progress
                </h2>
                <div className="space-y-3">
                  {processingSteps.map((step, index) => (
                    <ProcessingStepIndicator key={index} step={step} />
                  ))}
                </div>
              </div>
            )}

            {/* Generated Script */}
            {generatedScript && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Generated Script
                  {videoDuration && (
                    <span className="text-sm text-gray-500 ml-2">
                      ({Math.round(videoDuration)}s duration)
                    </span>
                  )}
                </h2>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {generatedScript}
                  </p>
                </div>
              </div>
            )}

            {/* Download Results */}
            {processedVideoUrl && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Download Results
                </h2>
                <div className="space-y-3">
                  <a
                    href={processedVideoUrl}
                    download
                    className="block w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-center"
                  >
                    Download Video with Subtitles
                  </a>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
