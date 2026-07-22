import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { navigateWithoutReload } from '../lib/navigation';
import { LegalContent } from './LegalContent';

const TERMS_TEXT = `HARVARD QUAD — UNRELEASED PROJECT NOTICE
Last Updated: July 22, 2026

Project Status

Harvard Quad is an independent, paused software project. It is not owned, sponsored, commissioned, or endorsed by Harvard University or any Harvard school. This historical branch is provided for portfolio review and does not represent a supported public service, production launch, or current deployment.

No Public Demo

No hosted deployment is currently approved as a recruiter or public demo. Do not create an account, upload content, or submit personal, academic, confidential, or copyrighted information to an unapproved deployment.

Source Evaluation

The repository may be inspected only under its proprietary license. No right to use, copy, deploy, modify, or redistribute the source is granted without permission from the project owners.

Future Service Terms

If the project is resumed and a supported service is launched, separate reviewed terms will govern that service. This project-status notice is not a substitute for those future terms.

Disclaimer

THE SOURCE AND ANY UNAPPROVED DEPLOYMENT ARE PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. USE OF AN UNAPPROVED DEPLOYMENT IS NOT RECOMMENDED.

Questions about the source should be directed to the repository owner through GitHub.`;

export function TermsPage() {
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
          <h1 className="text-lg font-semibold">Project Status</h1>
        </div>
      </header>
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        <div className="text-[#27251f] text-sm leading-relaxed">
          <LegalContent text={TERMS_TEXT} />
        </div>
      </main>
    </div>
  );
}
