import { useRouter } from "next/router";
export default function CTABanner() {
  const router = useRouter();
  return (
    <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to optimize your team's time and capacity?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join hundreds of Canadian businesses already using Caply to streamline their operations
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => router.push("/login")} className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors">
              Start Free Trial
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
              See a Demo
            </button>
          </div>
        </div>
      </section>
  )
}