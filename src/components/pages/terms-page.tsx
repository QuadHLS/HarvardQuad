import React from "react"
import { ArrowLeft } from "lucide-react"
import { navigateWithoutReload } from "@/lib/navigation"
import { LegalContent } from "@/components/LegalContent"

const TERMS_TEXT = `QUAD — TERMS OF SERVICE
Effective Date: September 1, 2025

Quad ("Quad," "we," "us," or "our") is a peer-to-peer academic resource. By creating or registering an account, signing into the Service, or accessing the Service, you agree to these Terms and to our Privacy Policy. If you do not agree, do not use the Service.

Definitions
• Service means Quad's website, applications, and related services.
• User, Student, "you," or "your" means any person who accesses or uses the Service.

Eligibility; Account Registration

The Service is offered only to individuals who are 18 years old and currently enrolled at a supported university. You must keep credentials confidential and promptly notify us of unauthorized use.

The Service & Directory Visibility

Quad enables eligible Users to connect with classmates. You may not copy, scrape, export, or use Directory Information outside the Service.

Ownership; Licenses

You retain all rights in your content. You grant Quad a non-exclusive, worldwide, royalty-free license to host, store, and display your content within the Service.

User Responsibilities

You represent that your content does not infringe others' rights and you comply with law and these Terms.

Acceptable Use

You agree not to scrape, harvest, or mass-download content; export or share materials outside the Service without permission; or use the Service to cheat or facilitate academic misconduct.

Moderation; Enforcement

We may remove content or restrict accounts to protect users and enforce these Terms.

Disclaimers

THE SERVICE IS PROVIDED "AS IS." TO THE FULLEST EXTENT PERMITTED BY LAW, QUAD DISCLAIMS ALL WARRANTIES.

Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, QUAD WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.

Contact: legal@quadhls.com`

export function TermsPage() {
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
          <h1 className="text-lg font-semibold">Terms of Service</h1>
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-8" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-3xl mx-auto text-foreground text-sm leading-relaxed">
          <LegalContent text={TERMS_TEXT} />
        </div>
      </main>
    </div>
  )
}
