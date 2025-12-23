"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { signUpWithProfile } from "@/lib/actions"
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
          Creating account...
        </>
      ) : (
        "Create Account"
      )}
    </Button>
  )
}

export default function SignUpForm() {
  const [state, formAction] = useActionState(signUpWithProfile, null)

  return (
    <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-2xl">
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <Image src="/dumpster-dudez-logo.svg" alt="Dumpster Dudez" width={120} height={60} className="h-16 w-auto" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Join Dumpster Dudez</h1>
        <p className="text-lg text-gray-600">Create your account</p>
      </div>

      <form action={formAction} className="space-y-6">
        {state?.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{state.error}</div>
        )}

        {state?.success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{state.success}</div>
        )}

        <div className="space-y-4">
          {/* ✅ Replace Franchise Name with Franchise Code */}
          <div className="space-y-2">
            <label htmlFor="franchiseCode" className="block text-sm font-medium text-gray-700">
              Franchise Code
            </label>
            <Input
              id="franchiseCode"
              name="franchiseCode"
              type="text"
              placeholder="ROCH"
              required
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
            />
            <p className="text-xs text-gray-500">Ask your admin for your franchise code (example: ROCH).</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="John Smith"
              required
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="owner@dumpsterdudez.com"
              required
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="555-123-4567"
              className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Role
            </label>
            {/* You can keep the dropdown for now, but your server action should restrict self-signup.
                Recommended: only allow owners to self-sign up. */}
            <Select name="role" defaultValue="owner">
              <SelectTrigger className="bg-white border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Franchise Owner</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="driver">Driver</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <Input id="password" name="password" type="password" required className="bg-white border-gray-300 text-gray-900" />
          </div>
        </div>

        <SubmitButton />

        <div className="text-center text-gray-600">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-orange-600 hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  )
}
