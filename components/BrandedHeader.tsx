"use client"

import Image from "next/image"
import { ArrowLeft, LogOut, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  franchiseName?: string | null
  subtitle: string // "Fleet Maintenance" | "Manager Dashboard"
  showBackToHome?: boolean
  onBackToHome?: () => void
  showSettings?: boolean
  onSettings?: () => void
  showLogout?: boolean
  onLogout?: () => void
}

export default function BrandedHeader({
  franchiseName,
  subtitle,
  showBackToHome,
  onBackToHome,
  showSettings,
  onSettings,
  showLogout,
  onLogout,
}: Props) {
  const title = franchiseName ? `Dumpster Dudez of ${franchiseName}` : "Dumpster Dudez"

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b border-border">
      <div className="relative container mx-auto px-4 py-3">
        {/* Left controls */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {showBackToHome ? (
            <Button variant="ghost" size="sm" onClick={onBackToHome} className="h-9 w-9 p-0" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        {/* Right controls */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {showSettings ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onSettings}
              className="h-9 w-9 p-0 sm:h-9 sm:w-auto sm:px-3"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          ) : null}

          {showLogout ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="h-9 w-9 p-0 sm:h-9 sm:w-auto sm:px-3"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          ) : null}
        </div>

        {/* Center brand (add side padding so absolute buttons don't overlap) */}
        <div className={cn("flex flex-col items-center gap-2", "px-16 sm:px-24")}>
          <Image
            src="/dumpster-dudez-logo.svg"
            alt="Dumpster Dudez"
            width={220}
            height={80}
            priority
            className="h-12 sm:h-10 w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.12)]"
          />

          <div className="text-center leading-tight">
            <div className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground">{title}</div>
            <div className="text-sm italic text-muted-foreground">{subtitle}</div>
          </div>
        </div>
      </div>

      {/* Orange brand divider */}
      <div className="h-1 w-full bg-orange-500/90" />
    </header>
  )
}
