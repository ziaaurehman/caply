"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import TopBanner from "@/components/landing/TopBanner";
import LandingHeader from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Pricing from "@/components/landing/Pricing";
import CallToAction from "@/components/landing/CallToAction";
import Footer from "@/components/landing/Footer";
import DeviceMockups from "@/components/landing/DeviceMockups";
import MovingBanner from "@/components/landing/MovingBanner";
import TestimonialsSection from "@/components/landing/testimonials-section";
import DemoSection from "@/components/landing/DemoSection";
import FAQSection from "@/components/landing/FAQSection";
import CTABanner from "@/components/landing/CTABanner";
import { useSubscriptionStore } from "@/lib/stores/subscriptionStore";
import { useAuthStore } from "@/lib/stores/authStore";

export default function LandingPage() {
  const [activeSection, setActiveSection] = useState("Home");
  const { data: session } = useSession();
  const { organization, fetchUserFromNextAuth } = useAuthStore();
  const { fetchCurrentSubscription } = useSubscriptionStore();

  // Initialize auth store when NextAuth session exists
  useEffect(() => {
    if (session && !organization) {
      fetchUserFromNextAuth(session);
    }
  }, [session, organization, fetchUserFromNextAuth]);

  // Load subscription data for authenticated users
  useEffect(() => {
    if (session && organization) {
      fetchCurrentSubscription(organization.id);
    }
  }, [session, organization, fetchCurrentSubscription]);

  // Detect which section is currently in view
  useEffect(() => {
    const sections = ["Home", "features", "pricing", "contact"];

    const handleScroll = () => {
      // Get current scroll position
      const scrollPosition = window.scrollY + window.innerHeight / 3; // Adjust viewing area

      // Find the current section
      let currentSection = "Home"; // Default to Home

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;

          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            currentSection = section;
            break;
          }
        }
      }

      if (currentSection !== activeSection) {
        setActiveSection(currentSection);
      }
    };

    // Use throttled scroll event for better performance
    let ticking = false;
    const scrollListener = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", scrollListener);
    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener("scroll", scrollListener);
    };
  }, [activeSection]);

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);

    // Scroll to section
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* <TopBanner /> */}
      <LandingHeader
        activeSection={activeSection}
        onSectionClick={handleSectionClick}
      />
      <main>
        <div id="Home">
          <Hero />
        </div>
        <DeviceMockups />

        {/* Moving Banner with proper spacing */}
        {/* <div className="pt-16 bg-gray-50">
          <MovingBanner />
        </div> */}

        <div id="features">
          <Features />
          <DemoSection />
        </div>
        {/* <div id="demo"></div> */}

        <div id="pricing">
          <Pricing />
          <TestimonialsSection />
          <FAQSection />
        </div>
        {/* <div id="testimonials">
        </div>
        <div id="faq">
        </div> */}
      </main>
      <Footer />
    </div>
  );
}
