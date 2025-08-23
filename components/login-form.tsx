"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, Suspense } from "react"
import { signIn } from "@/lib/actions"
import Image from "next/image"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg font-medium rounded-lg h-[60px]"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Signing in...
        </>
      ) : (
        "Sign In"
      )}
    </Button>
  )
}

function LoginFormContent() {
  const router = useRouter()
  const [state, formAction] = useActionState(signIn, null)

  // Handle successful login by redirecting
  useEffect(() => {
    if (state?.success) {
      router.push("/")
    }
  }, [state, router])

  return (
    <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-2xl">
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <Image src="/dumpster-dudez-logo.svg" alt="Dumpster Dudez" width={120} height={60} className="h-16 w-auto" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Welcome to Dumpster Dudez</h1>
        <p className="text-lg text-gray-600">Sign in to manage your fleet</p>
      </div>

      <form action={formAction} className="space-y-6">
        {state?.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{state.error}</div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@dumpsterdudez.com"
              required
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              className="bg-white border-gray-300 text-gray-900"
            />
          </div>
        </div>

        <SubmitButton />

        <div className="text-center text-gray-600">
          Don't have an account?{" "}
          <Link href="/auth/sign-up" className="text-orange-600 hover:underline font-medium">
            Sign up
          </Link>
        </div>
      </form>
    </div>
  )
}

export default function LoginForm() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md space-y-8">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  )
}
