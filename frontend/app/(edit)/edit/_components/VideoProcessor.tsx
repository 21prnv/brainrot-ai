"use client";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  FileVideo,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
} from "lucide-react";

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

      // Step 2: Generate script and process video using API route
      updateProcessingStep("Generate Script", "processing");

      const formData = new FormData();
      formData.append("video", selectedFile);
      formData.append("videoDuration", videoDuration.toString());
      formData.append("subtitleOptions", JSON.stringify(subtitleOptions));

      const response = await fetch("/api/video-process", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "API request failed");
      }

      const result = await response.json();

      if (result.success) {
        setGeneratedScript(result.data.script);
        updateProcessingStep(
          "Generate Script",
          "completed",
          `${result.data.wordCount} words`
        );
        updateProcessingStep("Process Subtitles", "completed");
        updateProcessingStep("Add to Video", "completed");

        // Set the processed video URL for download
        if (result.data.downloadUrl) {
          setProcessedVideoUrl(result.data.downloadUrl);
        }
      } else {
        throw new Error(result.error || "Processing failed");
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
          return <CheckCircle className="h-4 w-4 text-green-500" />;
        case "processing":
          return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
        case "error":
          return <AlertCircle className="h-4 w-4 text-red-500" />;
        default:
          return <Clock className="h-4 w-4 text-gray-400" />;
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
      <div className={`flex items-center space-x-3 ${getStepColor()}`}>
        {getStepIcon()}
        <span className="text-sm font-medium">{step.name}</span>
        {step.message && (
          <Badge variant="secondary" className="text-xs">
            {step.message}
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Video Script & Subtitle Generator
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Transform your videos with AI-generated commentary scripts and
            professional subtitles
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Left Column - Upload & Settings */}
          <div className="space-y-6">
            {/* File Upload */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Video
                </CardTitle>
                <CardDescription>
                  Select a video file to generate commentary and add subtitles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="video-upload">Video File</Label>
                  <Input
                    id="video-upload"
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                  />
                </div>

                {selectedFile && (
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <FileVideo className="h-8 w-8 text-blue-500" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    {videoDuration && (
                      <div className="mt-3 pt-3 border-t">
                        <Badge
                          variant="outline"
                          className="text-green-700 border-green-200"
                        >
                          Duration: {Math.floor(videoDuration / 60)}m{" "}
                          {Math.floor(videoDuration % 60)}s
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subtitle Options */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Subtitle Configuration</CardTitle>
                <CardDescription>
                  Customize subtitle appearance and format
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Format</Label>
                    <Select
                      value={subtitleOptions.format}
                      onValueChange={(value: string) =>
                        setSubtitleOptions((prev) => ({
                          ...prev,
                          format: value as "srt" | "vtt",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="srt">SRT (SubRip)</SelectItem>
                        <SelectItem value="vtt">WebVTT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={subtitleOptions.subtitleType}
                      onValueChange={(value: string) =>
                        setSubtitleOptions((prev) => ({
                          ...prev,
                          subtitleType: value as "hard" | "soft",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hard">Hard (Burned)</SelectItem>
                        <SelectItem value="soft">Soft (Track)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Font Size: {subtitleOptions.fontSize}px</Label>
                  <Slider
                    value={[subtitleOptions.fontSize]}
                    onValueChange={(value: number[]) =>
                      setSubtitleOptions((prev) => ({
                        ...prev,
                        fontSize: value[0],
                      }))
                    }
                    max={48}
                    min={16}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Font Color</Label>
                    <Select
                      value={subtitleOptions.fontColor}
                      onValueChange={(value: string) =>
                        setSubtitleOptions((prev) => ({
                          ...prev,
                          fontColor: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="white">White</SelectItem>
                        <SelectItem value="black">Black</SelectItem>
                        <SelectItem value="yellow">Yellow</SelectItem>
                        <SelectItem value="red">Red</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Select
                      value={subtitleOptions.position}
                      onValueChange={(value: string) =>
                        setSubtitleOptions((prev) => ({
                          ...prev,
                          position: value as "bottom" | "top" | "center",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom">Bottom</SelectItem>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Process Button */}
            <Button
              onClick={processVideoWithSubtitles}
              disabled={!selectedFile || !videoDuration || isProcessing}
              className="w-full h-12 text-lg font-semibold bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing Video...
                </>
              ) : videoDuration ? (
                <>
                  <FileVideo className="mr-2 h-5 w-5" />
                  Generate {Math.round(videoDuration)}s Script & Add Subtitles
                </>
              ) : (
                <>
                  <FileVideo className="mr-2 h-5 w-5" />
                  Generate Script & Add Subtitles
                </>
              )}
            </Button>
          </div>

          {/* Right Column - Results & Progress */}
          <div className="space-y-6">
            {/* Processing Progress */}
            {(isProcessing ||
              processingSteps.some((step) => step.status !== "pending")) && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Processing Progress</CardTitle>
                  <CardDescription>
                    Track the status of your video processing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {processingSteps.map((step, index) => (
                      <div key={index}>
                        <ProcessingStepIndicator step={step} />
                        {index < processingSteps.length - 1 && (
                          <Separator className="mt-4" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generated Script */}
            {generatedScript && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Generated Script
                    {videoDuration && (
                      <Badge variant="outline">
                        {Math.round(videoDuration)}s duration
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    AI-generated commentary script for your video
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                      {generatedScript}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Download Results */}
            {processedVideoUrl && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Download Results</CardTitle>
                  <CardDescription>
                    Your video with subtitles is ready for download
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    asChild
                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-lg font-semibold"
                  >
                    <a href={processedVideoUrl} download>
                      <Download className="mr-2 h-5 w-5" />
                      Download Video with Subtitles
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Error Display */}
            {error && (
              <Card className="border-0 shadow-lg border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 text-red-700">
                    <AlertCircle className="h-5 w-5" />
                    <p className="font-medium">{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
