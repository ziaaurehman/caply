import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function CallToAction() {
  return (
    <section className="bg-primary-600">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          <span className="block">Ready to optimize your team's capacity?</span>
          <span className="block text-primary-200">Start your free trial today.</span>
        </h2>
        <div className="mt-8 lg:mt-0 lg:flex-shrink-0">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-md px-8 py-3 text-base font-medium text-primary-600 bg-white hover:bg-primary-50 transition-colors"
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
