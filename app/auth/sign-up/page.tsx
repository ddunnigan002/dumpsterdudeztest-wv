import { redirect } from "next/navigation"
import SignUpForm from "@/components/sign-up-form"
import { createClient } from "@/lib/supabase/server"

export default async function SignUpPage() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-600 p-4">
      <SignUpForm />
    </div>
  )
}
