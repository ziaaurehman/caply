import { useSubscriptionModal } from "@/lib/hooks/useSubscriptionModal"
import { CreditCard } from "lucide-react"

export default function SubscriptionTrigger() {
  const { openSubscriptionModal } = useSubscriptionModal()

  return (
    <button
      onClick={openSubscriptionModal}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
    >
      <CreditCard className="h-4 w-4 mr-2" />
      View Plans
    </button>
  )
}
