"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";
import { Pacifico } from "next/font/google";
import Image from "next/image";

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: ["400"],
});
export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  return (
    <div className="min-h-screen w-full relative bg-white">
      {/* Purple Glow Left */}

      {/* Header */}
      <header className="flex relative items-center justify-between px-6 py-4 max-w-7xl mx-auto z-50">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Brainrot AI" width={32} height={32} />
          <span className="text-xl font-semibold">Brainrot AI</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#" className="text-gray-700 hover:text-gray-900">
            Home
          </a>
          <a href="#" className="text-gray-700 hover:text-gray-900">
            Pricing
          </a>
          <a href="#" className="text-gray-700 hover:text-gray-900">
            Tools
          </a>
          <a href="#" className="text-gray-700 hover:text-gray-900">
            Testimonials
          </a>
        </nav>

        <Button className="bg-black text-white hover:bg-gray-800 rounded-full px-6">
          Get in touch
        </Button>
      </header>
      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-16 text-center relative z-10">
        <h1 className="text-5xl md:text-7xl font-semibold leading-tight mb-6">
          Create brainrot sh*t that actually goes viral
        </h1>

        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Subtitles. Commentary. Vibes.
          <br />
          All cooked by AI for max virality
        </p>

        <Button className="bg-black text-white hover:bg-gray-800 rounded-full px-8 py-3 text-lg">
          Explore your style
        </Button>
      </main>
      <section className="px-5 w-full  relative z-10">
        <InfiniteMovingCards
          items={Array.from({ length: 11 }, (_, i) => ({
            key: i + 1,
            content: (
              <video
                src={`/assets/${i + 1}.mp4`}
                className="w-full h-full object-fill rounded-lg"
                muted
                loop
                autoPlay
                playsInline
                controls={false}
                preload="metadata"
              >
                <source src={`/assets/${i + 1}.mp4`} type="video/webm" />
              </video>
            ),
          }))}
          direction="left"
          speed="normal"
          pauseOnHover={true}
        />
      </section>

      <div className="flex justify-center items-center w-full h-full relative z-10 py-10">
        <h3 className="text-sm text-gray-500">Built by retard @21prnv</h3>
      </div>
      {/* Radial Gradient Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(125% 125% at 50% 2%, #fff 40%, #999BF2 100%)",
        }}
      />
    </div>
  );
}
