"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function signIn(prevState: any, formData: FormData) {
  if (!formData) return { error: "Form data is missing" }

  const email = formData.get("email")?.toString().trim()
  const password = formData.get("password")?.toString()

  if (!email || !password) return { error: "Email and password are required" }

  const supabase = createClient()

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) return { error: error.message }
    return { success: true }
  } catch (error) {
    console.error("Login error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function signUpWithProfile(prevState: any, formData: FormData) {
  if (!formData) return { error: "Form data is missing" }

  const email = formData.get("email")?.toString().trim()
  const password = formData.get("password")?.toString()
  const fullName = formData.get("fullName")?.toString().trim()
  const franchiseName = formData.get("franchiseName")?.toString().trim()
  const phone = formData.get("phone")?.toString().trim() || null
  const role = formData.get("role")?.toString().trim()

  if (!email || !password || !fullName || !franchiseName || !role) {
    return { error: "All required fields must be filled" }
  }

  // Recommended for now: only owners self-sign up
  if (role !== "owner") {
    return { error: "Only franchise owners can create accounts right now. Please contact your admin." }
  }

  const supabase = createClient()

  try {
    // 1) Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || "http://localhost:3000",
      },
    })

    if (authError) return { error: authError.message }
    const user = authData.user
    if (!user) return { error: "Signup failed: no user returned from Supabase." }

    // 2) Create franchise
    const { data: franchise, error: franchiseError } = await supabase
      .from("franchises")
      .insert({
        name: franchiseName,
        owner_email: email,
        phone,
      })
      .select("id")
      .single()

    if (franchiseError) {
      console.error("Franchise creation error:", franchiseError)
      return { error: "Failed to create franchise. Please try again." }
    }

    const franchiseId = franchise?.id
    if (!franchiseId) return { error: "Failed to create franchise. Please try again." }

    // 3) Ensure profile exists (trigger should do it; we upsert/update to be safe)
    const { error: profileUpsertError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email,
        full_name: fullName,
        phone,
      },
      { onConflict: "id" }
    )

    if (profileUpsertError) {
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({ email, full_name: fullName, phone })
        .eq("id", user.id)

      if (profileUpdateError) {
        console.error("Profile upsert/update error:", profileUpsertError, profileUpdateError)
        return { error: "Account created, but failed to save profile info." }
      }
    }

    // 4) Create membership (owner bootstrap)
    const { error: membershipError } = await supabase.from("franchise_memberships").insert({
      user_id: user.id,
      franchise_id: franchiseId,
      role: "owner",
      is_active: true,
    })

    if (membershipError) {
      console.error("Membership creation error:", membershipError)
      return { error: "Account created, but failed to link you to the franchise. Please contact support." }
    }

    return { success: "Account created! You can now log in with your email and password." }
  } catch (error) {
    console.error("Sign up error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function signUp(prevState: any, formData: FormData) {
  if (!formData) return { error: "Form data is missing" }

  const email = formData.get("email")?.toString().trim()
  const password = formData.get("password")?.toString()

  if (!email || !password) return { error: "Email and password are required" }

  const supabase = createClient()

  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || "http://localhost:3000",
      },
    })

    if (error) return { error: error.message }
    return { success: "Account created! You can now log in with your email and password." }
  } catch (error) {
    console.error("Sign up error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}
