"use client";

import { ArrowRight } from "lucide-react";
import { PieChart } from "lucide-react";
import { useRouter } from "next/navigation";
export default function Hero() {
  const router = useRouter();
  return (
    <section
      id="demos"
      className="relative overflow-hidden min-h-screen flex items-center"
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/hero-background.jpeg')`,
        }}
      ></div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/10"></div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80"></div>

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23ffffff' fillOpacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24  md:pb-24">
        {/* Hero Content */}
        <div className="text-center pb-20 lg:pb-32">
          {/* Logo Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-36 h-20  rounded-full flex items-center justify-center shadow-lg">
              <div className="w-36 h-16  rounded-full flex items-center justify-center border-2 border-primary-600">
                <div className="flex items-center">
                <PieChart className="h-10 w-10 text-primary-600" />
                <span className="ml-2 text-2xl font-bold text-primary-600">Caply</span>
         
                </div>
              </div>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Plan smarter. Track better.
            <br />
            Deliver faster.
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-3xl mx-auto">
            Run your business with confidence on a secure, Canadian-built
            platform.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-row gap-2 sm:gap-4 justify-center mb-16">
            <button
              onClick={() => router.push("/signup")}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-sm sm:text-lg transition-all duration-300 hover:shadow-lg hover:scale-105 flex items-center justify-center w-40 sm:w-64 h-10 sm:h-14"
            >
              Start Free
              <ArrowRight className="ml-1 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => router.push("/contact")}
              className="bg-white hover:bg-gray-100 text-gray-900 px-4 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-sm sm:text-lg transition-all duration-300 hover:shadow-lg hover:scale-105 flex items-center justify-center w-40 sm:w-64 h-10 sm:h-14"
            >
              Book a Demo
              <ArrowRight className="ml-1 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
