import { Suspense } from "react"
import TeamMembersPage from "@/components/pages/team-members/TeamMembersPage"
import { Loader2 } from "lucide-react"

export default function Employees() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      }
    >
      <TeamMembersPage />
    </Suspense>
  )
}
