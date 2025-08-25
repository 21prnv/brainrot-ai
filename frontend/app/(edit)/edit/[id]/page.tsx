"use client";

import VideoProcessor from "@/app/(edit)/edit/_components/VideoProcessor";
import { useParams } from "next/navigation";

export default function EditPage() {
  const { id } = useParams();
  return <VideoProcessor />;
}
