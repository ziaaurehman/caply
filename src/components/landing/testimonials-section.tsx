"use client"

import { useState, useEffect } from "react"

export default function TestimonialsSection() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const testimonials = [
    {
      id: 1,
      quote:
        "Caply has transformed how we manage our team's capacity. The time tracking and project planning features have increased our productivity by at least 30%.",
      name: "Sarah Johnson",
      company: "TechSolutions Inc.",
      avatar: "/placeholder.svg?height=52&width=52",
    },
    {
      id: 2,
      quote:
        "The invoice generation and expense tracking in Caply saved us countless hours each month. It's an essential tool for our growing business.",
      name: "Michael Chen",
      company: "InnovateCorp",
      avatar: "/placeholder.svg?height=52&width=52",
    },
    {
      id: 3,
      quote: "Caply's leave management system is hands down the most intuitive I've ever used. Our HR team loves it!",
      name: "Emma Rodriguez",
      company: "CreativeWorks",
      avatar: "/placeholder.svg?height=52&width=52",
    },
    {
      id: 4,
      quote:
        "We switched to Caply last year and our project delivery times improved by 25%. The capacity planning tools are a game-changer for our agency.",
      name: "David Kim",
      company: "DesignForward",
      avatar: "/placeholder.svg?height=52&width=52",
    },
    {
      id: 5,
      quote: "Caply gets better every month with new features. The team behind it clearly understands what businesses like ours need.",
      name: "Jessica Taylor",
      company: "GrowthPartners",
      avatar: "/placeholder.svg?height=52&width=52",
    },
    {
      id: 6,
      quote:
        "The client management features in Caply are exceptional. We can track everything from initial contact to final payment in one place.",
      name: "Robert Patel",
      company: "ConsultPro",
      avatar: "/placeholder.svg?height=52&width=52",
    },
    {
      id: 7,
      quote:
        "Started using Caply last quarter & I'm blown away. The reporting features give us insights we never had before about our team's productivity.",
      name: "Olivia Martinez",
      company: "DataDriven",
      avatar: "/placeholder.svg?height=52&width=52",
    },
    {
      id: 8,
      quote:
        "Caply helped us scale from 5 to 50 employees without hiring additional administrative staff. The automation is incredible.",
      name: "James Wilson",
      company: "ScaleUp Solutions",
      avatar: "/placeholder.svg?height=52&width=52",
    },
    {
      id: 9,
      quote:
        "The most useful business tool we've implemented this year is, without question, Caply. The ROI was evident within the first month.",
      name: "Sophia Lee",
      company: "ROI Maximizers",
      avatar: "/placeholder.svg?height=52&width=52",
    },
    {
      id: 10,
      quote:
        "Our team adoption of Caply was immediate. The intuitive interface meant minimal training and maximum productivity from day one.",
      name: "Thomas Brown",
      company: "EfficientWorks",
      avatar: "/placeholder.svg?height=52&width=52",
    },
    {
      id: 11,
      quote:
        "After trying multiple project management tools, we finally found Caply. It's the only solution that handles both resource planning and financial tracking effectively.",
      name: "Natalie Garcia",
      company: "ProjectMasters",
      avatar: "/placeholder.svg?height=52&width=52",
    },
    {
      id: 12,
      quote: "Caply's timesheet system is the best we've ever used. Simple for employees, powerful for management.",
      name: "Daniel Thompson",
      company: "TimeWise Consulting",
      avatar: "/placeholder.svg?height=52&width=52",
    },
  ]

  // Auto-advance slides on mobile
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % Math.ceil(testimonials.length / 3))
    }, 4000)
    return () => clearInterval(timer)
  }, [testimonials.length])

  // Split testimonials into columns for desktop
  const columns = [
    testimonials.filter((_, i) => i % 3 === 0),
    testimonials.filter((_, i) => i % 3 === 1),
    testimonials.filter((_, i) => i % 3 === 2),
  ]

  // Animation classes for each column
  const getColumnAnimation = (columnIndex: number) => {
    switch (columnIndex) {
      case 0: // Left column - moves up
        return "animate-scroll-up-slow"
      case 1: // Center column - moves down
        return "animate-scroll-down-slow"
      case 2: // Right column - moves up
        return "animate-scroll-up-slow"
      default:
        return "animate-scroll-up-slow"
    }
  }

  return (
    <section className="py-16 lg:py-24 bg-gray-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
       
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-semibold text-gray-900 mb-4 leading-tight">
            Trusted by<br />businesses worldwide
          </h2>
          <p className="text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
            Companies of all sizes use Caply to streamline their operations and boost productivity.
          </p>
        </div>

        {/* Desktop: Multi-column layout */}
        <div className="hidden lg:block relative">
          <div className="grid grid-cols-3 gap-6 max-h-[800px] overflow-hidden">
            {columns.map((column, columnIndex) => (
              <div
                key={columnIndex}
                className={`space-y-6 ${getColumnAnimation(columnIndex)}`}
                style={{
                  animationDelay: `${columnIndex * 1}s`,
                }}
              >
                {[...column, ...column].map((testimonial, index) => (
                  <TestimonialCard key={`${testimonial.id}-${index}`} testimonial={testimonial} />
                ))}
              </div>
            ))}
          </div>

          {/* Gradient overlays */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-gray-50 to-transparent pointer-events-none z-10" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none z-10" />
        </div>

        {/* Mobile: Carousel layout */}
        <div className="lg:hidden">
          <div className="relative overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {Array.from({ length: Math.ceil(testimonials.length / 3) }).map((_, slideIndex) => (
                <div key={slideIndex} className="w-full flex-shrink-0">
                  <div className="grid gap-4">
                    {testimonials.slice(slideIndex * 3, slideIndex * 3 + 3).map((testimonial) => (
                      <TestimonialCard key={testimonial.id} testimonial={testimonial} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile dots navigation */}
          <div className="flex justify-center mt-8 space-x-2">
            {Array.from({ length: Math.ceil(testimonials.length / 3) }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide ? "bg-gray-800 shadow-lg" : "bg-gray-300"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function TestimonialCard({ testimonial }: { testimonial: any }) {
  return (
    <div className="group relative bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      {/* Hover background effect */}
      <div className="absolute inset-0 bg-primary-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative z-10">
        {/* Quote */}
        <p className="text-gray-700 text-sm lg:text-base leading-relaxed mb-6">"{testimonial.quote}"</p>

        {/* Author */}
        <div className="flex items-center space-x-3">
          <img
            src={testimonial.avatar || "/placeholder.svg"}
            alt={testimonial.name}
            className="w-11 h-11 lg:w-13 lg:h-13 rounded-full object-cover"
          />
          <div>
            <p className="font-medium text-gray-900 text-base lg:text-lg group-hover:text-gray-800 transition-colors">
              {testimonial.name}
            </p>
            <p className="text-gray-600 text-base lg:text-lg group-hover:text-gray-700 transition-colors">
              {testimonial.company}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
