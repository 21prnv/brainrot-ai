import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get("video") as File;
    const videoDuration = parseFloat(formData.get("videoDuration") as string);
    const subtitleOptions = JSON.parse(
      formData.get("subtitleOptions") as string
    );

    if (!videoFile || !videoDuration) {
      return NextResponse.json(
        { error: "Video file and duration are required" },
        { status: 400 }
      );
    }

    // Step 1: Generate script using Google AI with duration-aware prompt
    const uploadedFile = await ai.files.upload({
      file: videoFile,
      config: { mimeType: videoFile.type },
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

    // Step 2: Process video with subtitles using backend
    const backendFormData = new FormData();
    backendFormData.append("video", videoFile);
    backendFormData.append("script", scriptText);
    backendFormData.append("format", subtitleOptions.format);
    backendFormData.append("subtitleType", subtitleOptions.subtitleType);
    backendFormData.append(
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
        body: backendFormData,
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!backendResponse.ok) {
      throw new Error(
        `Backend processing failed: ${backendResponse.statusText}`
      );
    }

    const backendResult = await backendResponse.json();

    return NextResponse.json({
      success: true,
      data: {
        script: scriptText,
        wordCount: scriptText.split(" ").length,
        videoId: backendResult.data.videoId,
        videoWithSubtitles: backendResult.data.videoWithSubtitles,
        downloadUrl: `http://localhost:5000/api/videos/download/${backendResult.data.videoId}`,
      },
    });
  } catch (error) {
    console.error("Error processing video:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: `Failed to process video: ${errorMessage}` },
      { status: 500 }
    );
  }
}
