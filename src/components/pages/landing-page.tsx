import React, { useState, useEffect } from "react"
import { Navigation } from "@/components/landing/Navigation"
import { Hero } from "@/components/landing/Hero"
import { Overview } from "@/components/landing/Overview"
import { Features } from "@/components/landing/Features"
import { Process } from "@/components/landing/Process"
import { Community } from "@/components/landing/Community"
import { Footer } from "@/components/landing/Footer"

interface LandingPageProps {
  onSignIn: () => void
}

export function LandingPage({ onSignIn }: LandingPageProps) {
  const [activeSection, setActiveSection] = useState("home")

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["home", "overview", "features", "process"]
      const scrollPosition = window.scrollY + 200

      for (const section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section)
            break
          }
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div
      className="min-h-screen"
      style={{
        background: `
          radial-gradient(ellipse 100% 80% at 10% 30%, rgba(249, 222, 202, 0.72), transparent 65%),
          radial-gradient(ellipse 85% 100% at 88% 50%, rgba(247, 212, 188, 0.68), transparent 60%),
          radial-gradient(ellipse 95% 75% at 50% 90%, rgba(248, 218, 195, 0.65), transparent 55%),
          radial-gradient(ellipse 75% 95% at 72% 12%, rgba(250, 228, 208, 0.68), transparent 58%),
          #faf6f1
        `,
      }}
    >
      <Navigation activeSection={activeSection} onSignIn={onSignIn} />
      <Hero onSignIn={onSignIn} />
      <Overview />
      <Features />
      <Process />
      <Community onSignIn={onSignIn} />
      <Footer />
    </div>
  )
}
