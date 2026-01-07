import { Suspense } from "react"
import ClientsPage from "@/components/pages/clients/ClientsPage"
import { Loader2 } from "lucide-react"

export default function Clients() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      }
    >
      <ClientsPage />
    </Suspense>
  )
}
