import { Suspense } from "react"
import SignUpPage from "@/components/pages/auth/SignUpPage"

export default function SignUp() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SignUpPage />
    </Suspense>
  )
}
