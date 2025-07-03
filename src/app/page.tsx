import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'
import LandingPage from "@/components/pages/landing/LandingPage"

export default async function Home() {
  const session = await getServerSession(authConfig)
  

  return <LandingPage />
}
