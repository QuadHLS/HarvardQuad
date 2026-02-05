import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { LegalContent } from './LegalContent';

const TERMS_TEXT = `Last Updated: February 3, 2026
1. ACCEPTANCE OF TERMS
These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "Student," or "You") and Quad ("The Operator," "we," "us," or "our").
By creating an account, accessing, or using Quad (the "Service"), you agree to be bound by these Terms. IF YOU DO NOT AGREE TO THESE TERMS, OR IF YOU ARE UNDER THE AGE OF 18, YOU MUST NOT ACCESS OR USE THE SERVICE.
2. CRITICAL DISCLAIMER: NO AFFILIATION
QUAD IS AN INDEPENDENT PRIVATE SERVICE. WE ARE NOT AFFILIATED, ASSOCIATED, AUTHORIZED, ENDORSED BY, OR IN ANY WAY OFFICIALLY CONNECTED WITH HARVARD UNIVERSITY, OR ANY OF ITS SUBSIDIARIES OR AFFILIATES. THE NAME "HARVARD" AS WELL AS RELATED NAMES, MARKS, EMBLEMS, AND IMAGES ARE REGISTERED TRADEMARKS OF THEIR RESPECTIVE OWNERS.
3. ELIGIBILITY & ACCOUNT SECURITY
• 3.1 Age Restriction: The Service is strictly limited to users who are 18 years of age or older. By using the Service, you represent and warrant that you meet this age requirement.
• 3.2 University Verification: Access to the Service is restricted to verified students. You must possess a valid, active .edu email address associated with the supported institution to register.
• 3.3 Account Credentials: You may register via Google Authentication ("Google Auth") or by creating unique credentials. You are solely responsible for maintaining the confidentiality of your login information. You accept responsibility for all activities that occur under your account.
• 3.4 Alumni Status: Upon graduation or withdrawal from the university, The Operator reserves the right to transition your account to "Alumni Status," which may include restricted access to features, forums, or course-specific data.
4. CONTENT OWNERSHIP & LICENSE GRANT
• 4.1 You Retain Ownership: You retain all ownership rights, including intellectual property rights, to the text, images, schedule data, and other materials you submit, post, or display on or through the Service ("User Content"). We do not claim ownership of your User Content.
• 4.2 License Grant to The Operator: By posting or sharing User Content on the Service, you grant The Operator a worldwide, non-exclusive, royalty-free, sublicensable, and transferable license to use, reproduce, modify, adapt, publish, translate, create derivative works from, distribute, perform, and display such User Content in connection with operating and providing the Service.
o What this means: This license allows us to host your posts on our servers, display them to other users, format them for mobile screens, and back them up.
• 4.3 Perpetual License for Forums: To maintain the continuity of conversations in our forums and group chats, the license you grant us for any content posted to public or semi-public areas of the Service is perpetual and irrevocable. This means that if you choose to delete your account, we maintain the right (but not the obligation) to keep your forum posts and chat messages visible on the Service, though we may anonymize them.
• 4.4 Your Warranty: You represent and warrant that you own or have the necessary rights and permissions to use and authorize us to use all User Content that you submit. You agree not to post content that violates the copyright, trademark, or proprietary rights of any third party.
5. ANONYMITY & CONDUCT
• 5.1 "Backend" Identity: While the Service offers "anonymous" forums where your identity is hidden from other Users, you acknowledge that your activity is NOT anonymous to The Operator. We maintain logs linking your posts to your account identity.
• 5.2 Cooperation with Law Enforcement: The Operator reserves the right, at its sole discretion, to "unmask" your identity and disclose your personal details, IP address, and location to university administration or law enforcement authorities if we believe your content involves:
o Threats of physical violence or self-harm.
o Credible terroristic threats.
o Felony-level illegal activity.
• 5.3 Prohibited Conduct: You agree not to use the Service to:
o Dox, harass, bully, stalk, or intimidate other users.
o Post hate speech based on race, gender, religion, or sexual orientation.
o Upload false course schedules to confuse group chats.
o Scrape or harvest data from the Service.
6. SCHEDULE DATA & VISIBILITY
• 6.1 Input Accuracy: You are responsible for the accuracy of the schedule data you input, whether via manual entry or image upload. The Operator makes no guarantee that the parsing of uploaded screenshots (if applicable) will be error-free.
• 6.2 Privacy Settings:
o Default: Your schedule and profile are visible only to Users you explicitly accept as "Friends."
o Public Option: You may opt-in to make your profile visible to all verified Users on the platform.
• 6.3 Automated Grouping: By inputting your schedule, you consent to being automatically added to group chats corresponding to your courses.
7. DISCLAIMERS & RELEASE (READ CAREFULLY)
• 7.1 "AS IS" SERVICE: THE SERVICE IS PROVIDED ON AN "AS-IS" AND "AS-AVAILABLE" BASIS. THE OPERATOR DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
• 7.2 USER DISPUTES & OFFLINE HARM: THE OPERATOR IS NOT RESPONSIBLE FOR YOUR INTERACTIONS WITH OTHER USERS. GROUP CHATS MAY FACILITATE OFFLINE MEETINGS. YOU AGREE THAT THE OPERATOR IS NOT LIABLE FOR ANY DAMAGE, INJURY, OR HARM ARISING FROM INTERACTIONS INITIATED THROUGH THE SERVICE.
• 7.3 ACADEMIC CONSEQUENCES: THE OPERATOR IS NOT LIABLE FOR ANY DISCIPLINARY ACTION TAKEN AGAINST YOU BY YOUR UNIVERSITY RESULTING FROM YOUR USE OF THIS SERVICE.
8. LIMITATION OF LIABILITY
TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT SHALL THE OPERATOR BE LIABLE TO YOU FOR ANY INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, OR PUNITIVE DAMAGES. THE OPERATOR'S TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING OUT OF THESE TERMS SHALL NOT EXCEED THE AMOUNT PAID BY YOU, IF ANY, TO USE THE SERVICE, OR $100.00 USD, WHICHEVER IS GREATER.
9. GOVERNING LAW & DISPUTE RESOLUTION
• 9.1 Jurisdiction: These Terms shall be governed by the laws of the Commonwealth of Massachusetts, without regard to its conflict of law provisions.
• 9.2 Arbitration: Any dispute arising under these Terms shall be resolved through binding arbitration in Boston, Massachusetts.
• 9.3 Class Action Waiver: You agree to resolve any disputes on an individual basis and waive the right to participate in a class action lawsuit.`;

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
                window.location.href = '/';
              }
            }}
            className="flex items-center gap-2 text-[#787771] hover:text-[#27251f] transition-colors appearance-none bg-transparent border-0 p-0 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h1 className="text-lg font-semibold">Terms of Service (ToS)</h1>
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
