# PING — iOS App Store submission

The game is a static web app (`index.html` + 6 files) wrapped with **Capacitor 8**
for the App Store. No game code changes are needed to ship — the native project just
hosts the same files. See spec §14 (the "port path").

- **App name (home screen):** PING
- **Bundle ID:** `com.nus.ping`  ← permanent, already set
- **Version / build:** 1.0 (1)  — bump `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` per release
- **Min iOS:** 15.0 · **Orientation:** portrait only · **Status bar:** hidden · **Encryption:** none declared

---

## 1. Build & open in Xcode (on your Mac)

```bash
npm install            # first time only (Capacitor CLI + tooling)
npm run ios:open       # syncs web files → www → ios, then opens Xcode
```

In Xcode: select the **App** target → **Signing & Capabilities** → check
*Automatically manage signing* and pick your **Team**. Press ▶ to run on a
simulator or a connected device.

> Xcode resolves the Capacitor Swift package (`capacitor-swift-pm`) from GitHub on
> first build — this needs network and is normal. (Headless CI in a sandbox can't do
> this artifact download; if you ever need a headless build, see "CI note" below.)

**After any change to the game files**, re-sync before building:
```bash
npm run cap:sync       # copies the 7 web files into the app and syncs ios
```

## 2. App Store Connect — create the app

At <https://appstoreconnect.apple.com> → **Apps → +**:
- **Name:** the store name must be globally unique. "PING" alone is likely taken —
  have a fallback ready (e.g. `PING — sonar`, `PING: the dark listens`). The
  home-screen name stays "PING" regardless.
- **Primary language**, **Bundle ID:** `com.nus.ping`, **SKU:** e.g. `ping-001`.
- **Category:** Games → (suggest *Puzzle* primary, *Arcade* secondary).

## 3. App Privacy — "No data collected"

PING makes **zero network requests** and stores only the unlocked-level count in
on-device `localStorage`. In App Store Connect → **App Privacy**:
- **Data collection:** *No, we do not collect data from this app.*
- No tracking, no third-party SDKs, no analytics.

## 4. Age rating

All "none" on the questionnaire → **4+**. No objectionable content, no web access,
no user-generated content.

## 5. Screenshots

Required: at least one **6.9"** iPhone set (1320 × 2868) — App Store Connect accepts
that size for all modern iPhones. Capture from a booted simulator:
```bash
xcrun simctl boot "iPhone 16 Pro Max"
xcrun simctl install booted ios/build/DD/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch booted com.nus.ping
xcrun simctl io booted screenshot shot.png     # repeat for title + a few levels
```
Good shots: the title/level-select, a mid ping revealing a maze, a drifter flash,
the level-complete wash. (Ask Claude to generate a set if useful.)

## 6. Archive & submit

In Xcode: set the run destination to **Any iOS Device (arm64)** →
**Product → Archive** → **Distribute App → App Store Connect → Upload**.
Once it appears in App Store Connect (a few minutes of processing), attach the build
to the version, fill description / keywords / support URL, and **Submit for Review**.

---

## CI note (headless builds only)

This repo's headless `xcodebuild` can't download Capacitor's SPM **binary
xcframeworks** from GitHub Releases (the artifact step hangs in a sandbox). To build
without network, point the package at local xcframeworks:

1. Download `Capacitor.xcframework.zip` and `Cordova.xcframework.zip` from
   `github.com/ionic-team/capacitor-swift-pm/releases/tag/8.4.1`, unzip into
   `ios/_local_caps/` (gitignored), and add an `ios/_local_caps/Package.swift` with
   `.binaryTarget(name:…, path:…)` for each.
2. Temporarily change `ios/App/CapApp-SPM/Package.swift`'s dependency to
   `.package(name: "capacitor-swift-pm", path: "../../_local_caps")`, delete
   `…/swiftpm/Package.resolved`, build, then restore the file.

This is **not** needed in Xcode on a real machine — only for sandboxed headless builds.
