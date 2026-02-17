# Meta Glasses Companion — Roadmap & Ideas

## Status: Phase 1 MVP (In Progress)
- [x] Expo + TypeScript scaffold
- [x] BLE service for Meta glasses pairing
- [x] Audio capture/playback (expo-av)
- [x] WebSocket service + Gemini Live API integration
- [x] Zustand state management
- [x] Tab navigation (Home / Devices / Settings)
- [x] Push-to-talk button with animation
- [x] Transcript chat view
- [x] EAS Build config for iOS
- [x] GitHub repo
- [ ] Apple Developer approval
- [ ] First TestFlight build
- [ ] Gemini API key configured + tested
- [ ] Real BLE pairing test with Meta glasses
- [ ] Audio streaming during recording (currently record-then-send)
- [ ] Persist settings to AsyncStorage
- [ ] App icon and splash screen design

## Phase 2: Camera Integration
- [ ] Meta DAT SDK integration (may require bare workflow eject)
- [ ] Camera feed capture from glasses
- [ ] Image → Gemini Vision for plant identification
- [ ] Photo attachment to work orders
- [ ] Equipment condition assessment via photo
- [ ] QR/barcode scanning through glasses camera

## Phase 3: PWA Companion View
- [ ] Web dashboard showing real-time transcripts
- [ ] Shared session between phone app and web
- [ ] Command history and search
- [ ] Manager view — see active field worker sessions
- [ ] Export conversation logs

## Phase 4: Advanced Features
- [ ] On-device wake word ("Hey WorkSuite")
- [ ] Offline command queuing with sync-on-reconnect
- [ ] Multi-language support (Spanish for field workers)
- [ ] Voice shortcuts ("Quick count" → starts inventory count flow)
- [ ] Haptic feedback through glasses for confirmations
- [ ] Integration with Claude reasoning layer (Ferny AI)
- [ ] WorkSuite MCP server connection for live mutations

## Ideas & Notes

### Technical Decisions to Make
- **Expo managed vs bare workflow**: Managed is fine for Phase 1. Phase 2 camera work with Meta DAT SDK may require ejecting to bare workflow.
- **Audio streaming**: Currently records full audio then sends. Should switch to streaming audio chunks during recording for real-time conversation feel.
- **Auth**: Need to decide how the app authenticates with WorkSuite/Ferny AI backend. Probably a simple API token initially.

### UX Ideas
- Temple tap on glasses = push-to-talk activation (maps to PTT button)
- Distinct audio chimes for: "listening", "processing", "done"
- Voice response + brief text summary shown on phone screen
- "Repeat that" command for when you miss the audio response
- Battery-aware mode — reduce polling when glasses battery is low

### Field Testing Scenarios
1. Walk through greenhouse, voice-count plants by variety
2. Create work order while inspecting equipment (hands dirty)
3. Log task completion with voice timestamp
4. Ask for inventory levels while on shipping dock
5. Identify unknown plant variety via camera

### Integration Architecture (from scope doc)
```
Meta Glasses (BLE audio) → Companion App → Gemini Live (speech-to-speech)
                                              ↓
                                         Claude/Ferny AI (reasoning)
                                              ↓
                                         WorkSuite MCP (execution)
                                              ↓
                                         Response → Gemini → Audio → Glasses
```
