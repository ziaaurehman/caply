"use client"

import { useState, useRef } from "react"
import { Play, Pause } from "lucide-react"

export default function DemoSection() {
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const toggleVideo = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  return (
    <section id="demo" className="py-20 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">See Caply in Action</h2>
          <p className="text-xl text-gray-300">Watch how Caply transforms your business operations</p>
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="bg-black rounded-2xl overflow-hidden shadow-2xl relative group">
            {!isPlaying && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
            )}
            
            <video 
              ref={videoRef}
              className="w-full aspect-video object-cover"
              poster="/thumnail.png"
              src="/video.webm"
              playsInline
              onEnded={() => setIsPlaying(false)}
            />
            
            <button 
              onClick={toggleVideo}
              className={`absolute ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'} 
                transition-opacity duration-300 z-20
                ${isPlaying ? 'bottom-6 right-6 w-12 h-12' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20'}
                bg-primary-600 rounded-full flex items-center justify-center hover:bg-primary-700 shadow-xl`}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" />
              )}
            </button>
            
            {!isPlaying && (
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white z-10">
                <h3 className="text-xl font-semibold mb-2">Caply Demo</h3>
                <p className="text-sm text-gray-300">See how our platform streamlines your workflow</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}