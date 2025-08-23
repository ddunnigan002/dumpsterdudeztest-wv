"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function signIn(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toString(),
      password: password.toString(),
    })

    if (error) {
      return { error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Login error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function signUpWithProfile(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")
  const fullName = formData.get("fullName")
  const franchiseName = formData.get("franchiseName")
  const phone = formData.get("phone")
  const role = formData.get("role")

  // Validate required fields
  if (!email || !password || !fullName || !franchiseName || !role) {
    return { error: "All required fields must be filled" }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    // Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toString(),
      password: password.toString(),
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || "http://localhost:3000",
      },
    })

    if (authError) {
      return { error: authError.message }
    }

    if (authData.user) {
      // Create franchise first (for owners) or find existing franchise
      let franchiseId = null

      if (role === "owner") {
        const { data: franchise, error: franchiseError } = await supabase
          .from("franchises")
          .insert({
            name: franchiseName.toString(),
            owner_email: email.toString(),
            phone: phone?.toString() || null,
          })
          .select()
          .single()

        if (franchiseError) {
          console.error("Franchise creation error:", franchiseError)
          return { error: "Failed to create franchise. Please try again." }
        }

        franchiseId = franchise.id
      } else {
        // For non-owners, they need to be invited to an existing franchise
        // For now, we'll use the sample franchise
        const { data: franchise } = await supabase
          .from("franchises")
          .select("id")
          .eq("name", "Dumpster Dudez - Main Location")
          .single()

        franchiseId = franchise?.id
      }

      if (!franchiseId) {
        return { error: "No franchise found. Please contact your franchise owner." }
      }

      // Create user profile
      const { error: profileError } = await supabase.from("users").insert({
        id: authData.user.id,
        franchise_id: franchiseId,
        email: email.toString(),
        full_name: fullName.toString(),
        role: role.toString(),
        phone: phone?.toString() || null,
      })

      if (profileError) {
        console.error("Profile creation error:", profileError)
        return { error: "Failed to create user profile. Please try again." }
      }
    }

    return { success: "Account created! Check your email to confirm your account." }
  } catch (error) {
    console.error("Sign up error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function signUp(prevState: any, formData: FormData) {
  // Check if formData is valid
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")

  // Validate required fields
  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const { error } = await supabase.auth.signUp({
      email: email.toString(),
      password: password.toString(),
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || "http://localhost:3000",
      },
    })

    if (error) {
      return { error: error.message }
    }

    return { success: "Check your email to confirm your account." }
  } catch (error) {
    console.error("Sign up error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function signOut() {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  await supabase.auth.signOut()
  redirect("/auth/login")
}
