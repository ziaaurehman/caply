"use client"
import TopBanner from "@/components/landing/TopBanner"
import LandingHeader from "@/components/landing/Header"
import Hero from "@/components/landing/Hero"
import Features from "@/components/landing/Features"
import Pricing from "@/components/landing/Pricing"
import CallToAction from "@/components/landing/CallToAction"
import Footer from "@/components/landing/Footer"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <TopBanner />
      <LandingHeader />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <CallToAction />
      </main>
      <Footer />
    </div>
  )
}
