# Meta Glasses Companion — Project Context

## Quick Resume

```bash
# After WSL restart, clone the project:
git clone https://github.com/Nathanvans0221/meta-glasses-companion.git /tmp/meta-glasses-companion
cd /tmp/meta-glasses-companion && npm install

# Or if /mnt/c is working:
cd /mnt/c/Users/NathanvanWingerden/meta-glasses-companion
git pull origin master
```

---

## Project Overview

A thin iOS companion app that bridges Meta Ray-Ban smart glasses to cloud AI services (Gemini Live for speech-to-speech, eventually Claude for reasoning + WorkSuite MCP for execution). Built with Expo + React Native.

**Full scope:** https://meta-glasses-scope.vercel.app/

---

## Key Info

| Field | Value |
|-------|-------|
| **GitHub** | `Nathanvans0221/meta-glasses-companion` |
| **Bundle ID** | `com.silverfern.worksuitevoice` |
| **Apple Team ID** | `W8KD69X9P8` |
| **EAS Project ID** | `530c0bbd-fe42-4480-ae98-9a226e4d09cd` |
| **Expo Account** | `nathanvans221` |
| **Build Profile** | `preview` (internal distribution, TestFlight not needed) |
| **OTA Channel** | `preview` |
| **Runtime Version** | `1.0.0` |

---

## Tech Stack

- **Expo SDK 54** (managed workflow with config plugins for BLE)
- **React Native 0.81.5** + TypeScript
- **react-native-ble-plx** — Bluetooth Low Energy for glasses pairing
- **expo-av** — Audio capture/playback
- **expo-file-system** — Reading recorded audio as base64
- **expo-haptics** — Tactile feedback on interactions
- **@expo/vector-icons** (Ionicons) — App icons
- **expo-keep-awake** — Prevents screen sleep during use
- **zustand** + persist middleware + AsyncStorage — State management
- **@react-navigation/bottom-tabs** — Tab navigation
- **Gemini Live API** via WebSocket (`BidiGenerateContent` endpoint)

---

## Architecture

```
App.tsx (SafeAreaProvider + Bottom Tab Nav)
├── Voice (HomeScreen)
│   ├── ConnectionStatus — BLE + AI status indicators
│   ├── TranscriptView — iMessage-style conversation bubbles
│   ├── PushToTalkButton — Hold-to-record with pulse animation
│   └── Text input + send button
├── Glasses (DevicesScreen)
│   ├── Header card with scan controls
│   └── DeviceCard list with signal bars
└── Settings (SettingsScreen)
    ├── Gemini API key + model
    ├── Dark/Light mode toggle
    ├── Keep Awake / Auto-Reconnect
    └── Clear History

Services Layer:
├── bluetooth.ts — BLE scan/connect via react-native-ble-plx
├── audio.ts — Record/playback with mode switching
├── websocket.ts — Generic WebSocket with auto-reconnect
└── gemini.ts — Gemini Live orchestration (connect/setup/send)

Stores (Zustand):
├── settingsStore.ts — API key, model, preferences (persisted to AsyncStorage)
├── conversationStore.ts — Messages, audio state, WS state
└── bluetoothStore.ts — BLE devices, connection state

Design System:
├── src/design/tokens.ts — SPACING, TYPOGRAPHY, RADIUS, SHADOWS, SIZES, ANIMATION
└── src/constants/index.ts — Color palettes (dark/light) with WorkSuite brand colors
```

---

## Design System

### Color Palette (WorkSuite-branded)

**Dark Mode:**
- Background: `#000000`
- Surface: `#1C1C1E` / Elevated: `#2C2C2E`
- Accent (WorkSuite teal): `#1A93AE`
- Text: `#DDDDDD` / `#AAAAAA` / `#777777`
- Success: `#4CAF50` | Error: `#F44336` | Warning: `#FFD60A`

**Light Mode:**
- Background: `#F2F2F7`
- Surface: `#FFFFFF`
- Accent: `#1A93AE`
- Text: `#333333` / `#555555` / `#888888`
- Success: `#66BB6A` | Error: `#EF5350` | Warning: `#FF9500`

### Design Tokens
- Spacing: 4-point grid (`xs:4, sm:8, md:12, lg:16, xl:20, 2xl:24, 3xl:32, 4xl:40, 5xl:48`)
- Typography: Apple HIG scale (largeTitle 34px → caption2 11px)
- Radius: `xs:4, sm:8, md:12, lg:16, xl:20, 2xl:24, full:9999`
- Shadows: sm/md/lg with iOS-style soft shadows

---

## Gemini Live API

```
WebSocket URL: wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key={API_KEY}
Model: gemini-2.0-flash-live-001
Audio: 16kHz mono 16-bit PCM sent as base64
```

**Connection flow:**
1. WebSocket connect to URL with API key
2. Send setup message with model + audio config
3. Send audio chunks as `realtimeInput.mediaChunks`
4. Receive text via `serverContent.modelTurn.parts[].text`
5. Receive audio via `serverContent.modelTurn.parts[].inlineData.data`
6. Turn complete signaled by `serverContent.turnComplete`

**Known quirks:**
- Auto-reconnect must be DISABLED for Gemini connections (causes connect/disconnect loop)
- Model name is `gemini-2.0-flash-live-001` (not `exp`)
- URL path already contains the service name, don't double it

---

## Build & Deploy

### Full Native Build (needed when adding native deps)
```bash
cd /tmp/meta-glasses-companion  # or /mnt/c path
CI=1 npx eas-cli build --platform ios --profile preview --non-interactive
```

### OTA Update (JS-only changes, instant deploy)
```bash
cd /tmp/meta-glasses-companion
CI=1 npx eas-cli update --channel preview --message "description of changes"
```

### How user gets updates:
- **New build:** Open the EAS build link on iPhone, install via QR code
- **OTA update:** Close and reopen the app — update applies automatically

### Current Build (as of 2026-02-18)
- Build: `23e84d4a-88f8-426e-bec3-4aca785e8cfc`
- Link: https://expo.dev/accounts/nathanvans221/projects/meta-glasses-companion/builds/23e84d4a-88f8-426e-bec3-4aca785e8cfc
- Includes: Full UI redesign + expo-haptics + vector-icons + voice pipeline + settings persistence

---

## Recent Changes (Latest First)

1. **WorkSuite brand color refinement** — Teal accent `#1A93AE`, WorkSuite text colors, Material palette semantics
2. **Complete UI overhaul** — Design token system, Ionicons, expo-haptics, Apple HIG structure, iMessage-style bubbles, iOS Settings-style grouped rows, pulse animation on PTT
3. **Voice pipeline wiring** — expo-file-system for base64 audio reading, audio playback state management, onTurnComplete/onPlaybackFinished callbacks
4. **Settings persistence** — AsyncStorage via zustand persist middleware
5. **Light/dark mode toggle** — useTheme() hook, StatusBar switching
6. **Custom app icon** — Mic with soundwave design
7. **EAS Update pipeline** — OTA updates via `eas update --channel preview`
8. **Initial scaffold** — Expo project with all services, stores, screens, components

---

## What's Blocked / Next Steps

### Blocked (waiting on external)
- **Physical Meta Ray-Ban glasses** — Can't test real BLE pairing without them
- **MCP server approval** — Waiting for WorkSuite MCP to be available for tool execution

### Ready to Build When Unblocked
- **Claude reasoning bridge** — Connect Claude API for complex reasoning tasks
- **WorkSuite MCP integration** — Execute WorkSuite actions via voice commands
- **Real glasses BLE testing** — Update service UUIDs for actual Meta DAT SDK
- **Camera/vision pipeline** — Route glasses camera feed for visual AI analysis

### Polish Items Available Now
- Add more animations (entrance animations on messages, screen transitions)
- Implement onboarding flow (first-launch tutorial)
- Add conversation export (share/save as markdown)
- Improve error states and retry logic
- Add app-level loading/splash screen

---

## Important Files

| File | Purpose |
|------|---------|
| `app.json` | Expo config (bundle ID, permissions, EAS project ID, updates config) |
| `eas.json` | Build profiles (dev/preview/production) with update channels |
| `src/design/tokens.ts` | Design system tokens (spacing, typography, radius, shadows) |
| `src/constants/index.ts` | Color palettes + Gemini config + audio settings |
| `src/hooks/useTheme.ts` | Theme hook (returns colors based on dark/light mode) |
| `src/services/gemini.ts` | Gemini Live API orchestration |
| `src/services/audio.ts` | Audio capture/playback with mode switching |
| `src/services/bluetooth.ts` | BLE scanning/connecting |
| `src/stores/settingsStore.ts` | Persisted settings (API key, mode, preferences) |

---

## Known Issues

- `expo-file-system` is a native dep added after the original build — any build from the latest code includes it
- Developer Mode must be enabled on iPhone (Settings > Privacy & Security > Developer Mode)
- EAS builds require interactive mode for first-time Apple credential setup
- `--non-interactive` flag is not supported for `eas update` — use `CI=1` env var instead
- Windows filesystem mount (`/mnt/c/`) occasionally goes down in WSL2 — clone from GitHub as fallback
