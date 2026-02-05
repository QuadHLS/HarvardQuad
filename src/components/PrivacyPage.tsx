import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { LegalContent } from './LegalContent';

const PRIVACY_TEXT = `Last Updated: February 3, 2026
1. INTRODUCTION
Quad ("we," "our," or "us") respects your privacy. This Privacy Policy explains how we collect, use, and share information about verified students ("you") when you use our website and services.
2. INFORMATION WE COLLECT
We collect information strictly necessary to provide our course-matching and social features.
A. Information You Provide to Us
• Account Data: Name, .edu email address, and password (if not using Google Auth).
• Schedule Data: Course names, numbers, times, professors, and locations. This may be collected via manual entry or by analyzing screenshots/PDFs you upload.
• Profile Content: Bio, profile photos, and other personal details you choose to share.
• Forum Content: Text and images posted to our anonymous forums. Note: We log the identity of the author of every post on our backend servers.
B. Information Collected Automatically
• Usage Logs: Timestamps of when you log in, pages viewed, and chats joined.
• Device Data: IP address, browser type, and operating system.
3. HOW WE USE YOUR INFORMATION
• To Provide the Service: We use your schedule data to automatically sort you into group chats with classmates.
• To Verify Eligibility: We use your email to ensure you are a current student at the supported university.
• To Moderate Content: We link your "anonymous" posts to your identity internally to investigate reports of harassment, threats, or illegal activity.
• To Improve Features: We may analyze aggregated trends (e.g., "Most popular courses") to enhance the platform.
4. SHARING OF INFORMATION
We do not sell your personal data to third parties at this time, but we reserve the right to do so in the future. We share your information in the following ways:
• Other Users (Based on Your Settings):
o Private (Default): Only friends see your schedule/profile.
o Public: If you opt-in, all verified students can see your schedule/profile.
• Service Providers: We may share data with cloud hosting providers (e.g., AWS, Google Cloud) solely to host the Service.
• Law Enforcement: We will disclose your information (including decoding your anonymous posts) if compelled by a court order, or if we believe in good faith that disclosure is necessary to prevent physical harm, violence, or illegal acts.
• Business Transfers: If Quad is involved in a merger, acquisition, or sale of assets, your information (including schedule data and post history) may be transferred to the new owner.
5. DATA RETENTION
We retain your personal data for as long as your account is active or as needed to provide you the Service.
• Alumni: If you graduate or leave the university, we may retain your account data but restrict your access permissions.
• Account Deletion: You may request full account deletion by contacting us. Upon deletion:
o Your personally identifiable profile information (Name, Email, Schedule) will be removed from our active databases.
o Forum & Chat Content: Due to the irrevocable license granted in our Terms of Service, content you posted to forums or group chats may remain visible on the platform to preserve the context of discussions for other students. However, this content will be disassociated from your profile (anonymized) so it is no longer personally linked to you.
6. COOKIES AND TRACKING
We use cookies to maintain your login session. We may use third-party analytics tools (like Google Analytics) to understand website traffic.
7. YOUR RIGHTS & CHOICES
• Access/Update: You can update your profile and schedule within the settings.
• Opt-Out: You can switch your profile visibility from "Public" to "Private" at any time.
8. CHANGES TO THIS POLICY
We may modify this Privacy Policy at any time. If we make material changes (e.g., deciding to sell user data to advertisers), we will notify you via the email address associated with your account.`;

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
                window.location.href = '/';
              }
            }}
            className="flex items-center gap-2 text-[#787771] hover:text-[#27251f] transition-colors appearance-none bg-transparent border-0 p-0 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h1 className="text-lg font-semibold">Privacy Policy (PP)</h1>
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
