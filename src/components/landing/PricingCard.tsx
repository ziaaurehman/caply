import { Card } from "../ui/Card"
import { CheckCircle } from "lucide-react"
import { cn } from "../../lib/utils"
import Link from "next/link"

interface PricingCardProps {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  highlight?: boolean
  badge?: string
  buttonText?: string
}

export default function PricingCard({
  name,
  price,
  period,
  description,
  features,
  highlight = false,
  badge,
  buttonText = "Start Free Trial",
}: PricingCardProps) {
  return (
    <Card
      className={cn(
        "bg-white p-8 transition-shadow relative border h-full flex flex-col rounded-2xl group border-gray-200 hover:border-primary-600 hover:ring-2 hover:ring-primary-200 hover:scale-105",
      )}
    >
      {badge && (
        <div className="absolute top-0 right-6 transform -translate-y-1/2">
          <div className="inline-flex items-center rounded-full bg-primary-50 px-4 py-1 text-sm font-medium text-primary-700">
            {badge}
          </div>
        </div>
      )}
      <h3 className="text-2xl font-bold text-gray-900">{name}</h3>
      <p className="mt-4">
        <span className="text-4xl font-extrabold text-primary-600">${price}</span>
        <span className="text-base font-medium text-gray-500">/{period}</span>
      </p>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
      <ul className="mt-8 space-y-4 flex-1">
        {features.map((feature, featureIndex) => (
          <li key={featureIndex} className="flex items-center text-left">
            <CheckCircle className="h-5 w-5 flex-shrink-0 mr-3 text-primary-600" />
            <span className="text-gray-500">{feature.replace(/\*\*/g, "")}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex-shrink-0">
        <Link
          href="/signup"
          className={cn(
            "w-full inline-flex items-center justify-center rounded-2xl px-4 py-2 text-base font-medium transition-colors border border-primary-600 bg-white text-primary-600 group-hover:bg-primary-600 group-hover:text-white group-hover:scale-105 group-hover:shadow group-hover:border-primary-600",
          )}
        >
          {buttonText}
        </Link>
      </div>
    </Card>
  )
}
