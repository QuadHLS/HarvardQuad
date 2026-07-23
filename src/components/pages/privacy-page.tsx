import React from "react"
import { ArrowLeft } from "lucide-react"
import { navigateWithoutReload } from "@/lib/navigation"
import { LegalContent } from "@/components/LegalContent"

const PRIVACY_TEXT = `HARVARD QUAD — PUBLIC REPOSITORY PRIVACY NOTICE
Last Updated: July 22, 2026

Repository Scope

Harvard Quad was paused before public launch. The repository contains implemented source, configuration templates, and schema history; it is not a supported public service and does not include a database dump, private user-level content, production credentials, or test-account credentials.

No Approved Hosted Use

No hosted deployment is currently presented or approved as a public demo. Do not create an account, upload files, or submit personal, academic, confidential, or copyrighted information to an unapproved deployment.

Local Development

A local copy requires a Supabase project controlled by the developer. Data entered into that environment is handled by that environment's operator and providers. Developers should use synthetic data and should not connect this source to an existing hosted project without authorization.

Future Service Privacy Terms

If the project is resumed and a supported service is launched, a separate reviewed privacy policy must describe the deployed data flows, providers, retention, user controls, and contact process. This repository notice does not authorize data collection for a future service.

Repository Questions

Questions about the public source should be directed to the repository owner through GitHub.`

export function PrivacyPage() {
  return (
    <div className="h-dvh flex flex-col bg-background text-foreground overflow-hidden">
      <header className="flex-shrink-0 border-b border-border bg-background px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            type="button"
            aria-label="Go back to previous page"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back()
              } else {
                navigateWithoutReload("/")
              }
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors appearance-none bg-transparent border-0 p-0 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h1 className="text-lg font-semibold">Repository Privacy Notice</h1>
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-8" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-3xl mx-auto text-foreground text-sm leading-relaxed">
          <LegalContent text={PRIVACY_TEXT} />
        </div>
      </main>
    </div>
  )
}
