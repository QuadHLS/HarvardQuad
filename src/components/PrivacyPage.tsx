import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { navigateWithoutReload } from '../lib/navigation';
import { LegalContent } from './LegalContent';

const PRIVACY_TEXT = `HARVARD QUAD — SOURCE PORTFOLIO PRIVACY NOTICE
Last Updated: July 22, 2026

Repository Scope

Harvard Quad is a paused, unreleased project. This historical branch is an engineering portfolio artifact, not a supported public service. The repository contains source code, configuration templates, and an iOS wrapper; it does not intentionally include a database dump, private user-level content, production credentials, or recruiter demo accounts.

No Approved Hosted Use

No hosted deployment is currently approved as a public or recruiter demo. Do not create an account, upload files, or submit personal, academic, confidential, or copyrighted information to an unapproved deployment.

Local Development

A local copy requires a Supabase project controlled by the developer. Data entered into that environment is handled by that environment's operator and providers. Developers should use synthetic data and should not connect this source to an existing hosted project without authorization.

Future Service Privacy Terms

If the project is resumed and a supported service is launched, a separate reviewed privacy policy must describe the deployed data flows, providers, retention, user controls, and contact process. This source-portfolio notice does not authorize data collection for a future service.

Repository Questions

Questions about the public source should be directed to the repository owner through GitHub.`;

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#27251f] flex flex-col">
      <header className="flex-shrink-0 border-b border-[#e7ded1] bg-[#FBF9F5] px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            type="button"
            aria-label="Go back to previous page"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigateWithoutReload('/');
              }
            }}
            className="flex items-center gap-2 text-[#787771] hover:text-[#27251f] transition-colors appearance-none bg-transparent border-0 p-0 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h1 className="text-lg font-semibold">Source Privacy Notice</h1>
        </div>
      </header>
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        <div className="text-[#27251f] text-sm leading-relaxed">
          <LegalContent text={PRIVACY_TEXT} />
        </div>
      </main>
    </div>
  );
}
