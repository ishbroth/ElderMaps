# ElderMaps on iPhone and Android

The apps are the website wrapped by Capacitor (the same code, in a native shell): there is no separate Swift or Kotlin app to maintain. `npm run app:sync` builds the site and copies it into `ios/` and `android/`. It is the same set-up as WastelandMaps, so the same Apple account, App Store Connect API key and GitHub secrets work for both.

## iOS: build in the cloud and send to TestFlight (no Mac needed)

`.github/workflows/ios-testflight.yml` builds the app on a GitHub-hosted Mac, signs it with Apple's cloud signing and uploads it to App Store Connect.

One-time set-up for this repository:
1. The App ID `com.eldermaps.app` is registered (done) and the app exists in App Store Connect (create it under Apps > + New App with the bundle ID `com.eldermaps.app` if it does not yet).
2. GitHub > this repo > Settings > Secrets and variables > Actions: add `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID` and `ASC_KEY_P8`. They are the same four values as in the WastelandMaps repository (the API key belongs to the Apple account, not to one app). The `VITE_GOOGLE_MAPS_API_KEY`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` secrets are already here for the website.

Each build: GitHub > Actions > **iOS build to TestFlight** > Run workflow. After about 15 minutes of building, App Store Connect processes the build (10 to 30 minutes more) and it appears under TestFlight. `iOS compile check` is a cheaper run (no signing, no upload) for checking that the project builds.

## What is different inside the app

- **Sign-in email link:** it opens `com.eldermaps.app://auth` (registered in `ios/App/App/Info.plist` and the Android manifest), which brings the person back into the app signed in. That address must be in Supabase > Authentication > URL Configuration > Redirect URLs.
- **Septims cannot be bought in the app yet.** Apple (and Google) require their own in-app purchase for digital goods, so the app shows a note instead of the Stripe packs (`purchasesAvailable()` in `src/lib/native.ts`). Septims bought on eldermaps.com still work after signing in. Adding Apple's purchase (StoreKit) and a server check of the receipt is a separate step.
- **Location** is asked for only while the app is open (`NSLocationWhenInUseUsageDescription`). There is no background location.
- **No encryption questions:** `ITSAppUsesNonExemptEncryption` is false.
- **Account deletion** is in the Inventory tab (required by Apple).
- **Privacy policy and support:** https://eldermaps.com/privacy.html and https://eldermaps.com/support.html (enter them in App Store Connect).

## Before the first App Store submission

- The app icon is still Capacitor's placeholder: replace `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` with the chosen 1024 x 1024 icon (no transparency, no rounded corners).
- Screenshots, a description, an age rating and the privacy answers in App Store Connect.
- Apple's purchase for septims, if septims are to be sold in the app.
