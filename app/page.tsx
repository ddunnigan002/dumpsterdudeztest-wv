"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Settings, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered: ", registration)
        })
        .catch((registrationError) => {
          console.log("SW registration failed: ", registrationError)
        })
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Image src="/dumpster-dudez-logo.svg" alt="Dumpster Dudez" width={160} height={50} className="h-8 w-auto" />
          </div>
          <Link href="/manager">
            <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-muted bg-transparent">
              <Settings className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Manager</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 leading-tight">Fleet Maintenance</h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
            Select your vehicle to access checklists and maintenance tools
          </p>
        </div>

        <div className="space-y-3">
          <Link href="/vehicle/CHEVY" className="block">
            <Card className="bg-card hover:bg-muted/50 transition-all duration-200 border-border hover:border-accent/30 active:scale-[0.98] cursor-pointer">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-accent/10 rounded-lg flex-shrink-0">
                    <Image src="/images/chevy-logo.png" alt="Chevy" width={24} height={24} className="h-6 w-6" />
                  </div>
                  <div className="text-left flex-1">
                    <CardTitle className="text-lg text-card-foreground">CHEVY</CardTitle>
                    <CardDescription className="text-muted-foreground">Unit #001</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-accent font-medium">Active</div>
                    <div className="text-xs text-muted-foreground">Last: Today</div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/vehicle/KENWORTH" className="block">
            <Card className="bg-card hover:bg-muted/50 transition-all duration-200 border-border hover:border-accent/30 active:scale-[0.98] cursor-pointer">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-accent/10 rounded-lg flex-shrink-0">
                    <Image src="/images/kenworth-logo.png" alt="Kenworth" width={24} height={24} className="h-6 w-6" />
                  </div>
                  <div className="text-left flex-1">
                    <CardTitle className="text-lg text-card-foreground">KENWORTH</CardTitle>
                    <CardDescription className="text-muted-foreground">Unit #002</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-accent font-medium">Active</div>
                    <div className="text-xs text-muted-foreground">Last: Yesterday</div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <Link href="/manager/reports/gas-analytics">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 text-base font-medium">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Fleet Reports
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-2">Analytics & maintenance reports</p>
        </div>

        <div className="h-8"></div>
      </main>
    </div>
  )
}
