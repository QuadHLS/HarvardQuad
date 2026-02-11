# Run the app on your iPhone via Xcode

## One-time setup (already done in this branch)

- **Capacitor** is in `package.json` (`@capacitor/core`, `@capacitor/ios`, `@capacitor/cli`).
- **Vite** is set to `base: './'` so the app loads correctly in the iOS WebView.
- **iOS project** is in `ios/App/` and uses Capacitor via Swift Package Manager.
- **Google login in-app**: Supabase only accepts `http://` or `https://` redirect URLs, so use your **deployed web app URL**:
  1. In Supabase: **Authentication → URL Configuration → Redirect URLs**, add:  
     `https://YOUR-DOMAIN.com/auth/callback`  
     (use your real domain, e.g. where the web app is hosted.)
  2. In the project root create or edit `.env` and set:  
     `VITE_APP_PUBLIC_URL=https://YOUR-DOMAIN.com`  
     (same origin as above, no trailing slash.)
  3. Rebuild and sync: `npm run sync:ios`.  
  The in-app browser will redirect to that URL after Google login; the callback page then sends the user back into the app.

## Sync iOS the right way

The **Capacitor CLI requires Node.js >= 22**. The project has an `.nvmrc` set to `22` so you can use the correct version.

**One-time: install nvm and Node 22**

1. Install nvm (in **Terminal.app** or your normal terminal):
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
   ```
2. Restart the terminal (or run `source ~/.zshrc`).
3. Install and use Node 22:
   ```bash
   nvm install 22
   nvm use 22
   ```
   In this project, `nvm use` will auto-switch to Node 22 because of the `.nvmrc` file.

**Every time you sync**

From the project root (with Node 22 active):

```bash
cd /Users/justin/Desktop/TheQuad
nvm use          # use Node 22 from .nvmrc (required by Capacitor)
npm run sync:ios
```

If you see **ETIMEDOUT** when running `npm run sync:ios` inside Cursor’s terminal, run the same commands in **macOS Terminal.app** instead; the sync usually completes there.

---

## Each time you want to run on device

1. **Build the web app and sync to iOS**
   ```bash
   npm run sync:ios
   ```
   Or step by step:
   ```bash
   npm run build
   npx cap sync ios
   ```

2. **Open in Xcode**
   ```bash
   npm run open:ios
   ```
   Or open `ios/App/App.xcworkspace` or `ios/App/App.xcodeproj` in Xcode.

3. **In Xcode**
   - Choose your **team** (Signing & Capabilities).
   - Select your **iPhone** as the run destination (or a simulator).
   - Click **Run** (or ⌘R).

4. **First time on a real device**
   - On the iPhone: **Settings → General → VPN & Device Management** → trust your developer certificate.

After code changes, run `npm run sync:ios` again, then build/run in Xcode.

## If you see a white screen after closing the in-app browser

The WebView may be loading from local assets. You can make the app load from your live site so the main screen and OAuth callback stay in sync:

1. In `capacitor.config.json` add (use your real domain):
   ```json
   "server": {
     "url": "https://harvardquad.com",
     "cleartext": false
   }
   ```
2. Run `npx cap sync ios` and run again from Xcode.

Remove the `server` block to go back to loading from built files.

---

# Upload to TestFlight

You need to be on **IOS-branch** and have an Apple Developer account. Use the same flow for Internal Testing or External (TestFlight) testers.

## 1. Build the web app and sync to iOS

```bash
npm run sync:ios
```

## 2. Open the project in Xcode

```bash
npm run open:ios
```

Or open **`ios/App/App.xcworkspace`** in Xcode (use the `.xcworkspace`, not just the `.xcodeproj` if you have one).

## 3. Configure signing and identity

- In Xcode: select the **App** target → **Signing & Capabilities**.
- Check **Automatically manage signing**.
- Choose your **Team** (your Apple Developer account).
- Set **Bundle Identifier** to something unique (e.g. `com.yourteam.HarvardQuad`). It must match an App ID in [App Store Connect](https://appstoreconnect.apple.com) (or create one under **Certificates, Identifiers & Profiles → Identifiers**).

## 4. Set version and build number

- In the **App** target → **General** tab:
  - **Version** (e.g. `1.0.0`) – shown to users.
  - **Build** (e.g. `1`) – must increase for each upload to TestFlight/App Store. Increment this every time you upload a new build.

## 5. Create an archive

- In Xcode menu: **Product → Destination → Any iOS Device (arm64)** (not a simulator).
- Then **Product → Archive**.
- Wait for the archive to finish. The **Organizer** window will open with your archive.

## 6. Upload to App Store Connect

- In Organizer, select your archive and click **Distribute App**.
- Choose **App Store Connect** → **Next**.
- **Upload** → **Next**.
- Leave options as default (e.g. upload symbols, manage version and build automatically) → **Next**.
- Select your distribution certificate and provisioning profile (Xcode usually manages these) → **Next**.
- Review and click **Upload**. Wait until the upload completes.

## 7. Enable the build in TestFlight

- Go to [App Store Connect](https://appstoreconnect.apple.com) → your app → **TestFlight**.
- The new build can take **5–15 minutes** to appear. When it shows up, select it.
- For **Internal Testing**: add testers (they must be in your App Store Connect team with certain roles).
- For **External Testing** (public TestFlight): create a group, add the build, add external testers (they get an email invite). The first time you add an external group, Apple may run a short review (often same day).

## Troubleshooting

- **“No accounts with App Store Connect access”**  
  Sign in to Xcode with your Apple ID: **Xcode → Settings → Accounts** → add your Apple Developer account.

- **“Failed to register bundle identifier”**  
  The bundle ID is already in use or not created. Create the App ID in [developer.apple.com](https://developer.apple.com/account) under **Certificates, Identifiers & Profiles → Identifiers**.

- **Archive is disabled**  
  Set the run destination to **Any iOS Device (arm64)**, not a simulator.

- **Build doesn’t appear in TestFlight**  
  Wait 10–15 minutes and refresh. If it still doesn’t show, check the build’s status in the **Activity** tab in App Store Connect; processing can take a bit.
