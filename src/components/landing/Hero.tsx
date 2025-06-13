"use client"
import Link from "next/link"
import Button from "../ui/Button"
import { Shield, ArrowRight, PlayCircle } from "lucide-react"

export default function Hero() {
  return (
    <section className="relative overflow-hidden py-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary-50 via-white to-white" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-6">
            <div className="inline-flex items-center rounded-full bg-primary-50 px-4 py-1 text-sm font-medium text-primary-700 mb-6">
              <Shield className="h-4 w-4 mr-2" />
              Canadian-built platform
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl">
              <span className="block">Plan smarter.</span>
              <span className="block text-primary-600">Track better.</span>
              <span className="block">Deliver faster.</span>
            </h1>
            <p className="mt-6 text-xl text-gray-500">
              Run your business with confidence on a secure, Canadian-built platform.
            </p>
            <div className="mt-8 flex space-x-4">
              <Link href="/signup">
                <Button size="lg" className="bg-primary-600 hover:bg-primary-700 group">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                leftIcon={<PlayCircle className="h-5 w-5" />}
                className="text-primary-600 border-primary-600 hover:bg-primary-50"
              >
                Book a Demo
              </Button>
            </div>
            <p className="mt-3 text-sm text-gray-500 flex items-center">
              <Shield className="h-4 w-4 mr-1 text-success-500" />
              No credit card required
            </p>
          </div>
          <div className="mt-12 lg:mt-0 lg:col-span-6">
            <div className="relative">
              <div className="absolute -inset-4">
                <div className="w-full h-full mx-auto opacity-30 blur-lg filter bg-gradient-to-r from-primary-600 to-secondary-500" />
              </div>
              <img src="https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg" alt="Team planning" className="rounded-lg shadow-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
