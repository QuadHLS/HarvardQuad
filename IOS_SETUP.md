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
