import ExpoModulesCore

#if canImport(MWDATCore)
import MWDATCore
#endif

#if canImport(MWDATCamera)
import MWDATCamera
#endif

/// Expo native module bridging the Meta Wearables DAT SDK to React Native.
/// Uses conditional compilation — builds with or without the DAT SDK binary.
/// When SDK is unavailable, all functions return graceful "unavailable" responses.
public class MetaGlassesModule: Module {

  // MARK: - State

  private var isConfigured = false

#if canImport(MWDATCore)
  private var registrationToken: AnyObject?
  private var devicesToken: AnyObject?
  private var linkStateTokens: [AnyObject] = []
#endif

#if canImport(MWDATCamera)
  private var streamSession: StreamSession?
  private var deviceSelector: AutoDeviceSelector?
  private var videoFrameToken: AnyObject?
  private var photoDataToken: AnyObject?
  private var stateToken: AnyObject?
  private var errorToken: AnyObject?
  private var lastFrameSentTime: TimeInterval = 0
  private var frameThrottleInterval: TimeInterval = 1.0
#endif

  // MARK: - Module Definition

  public func definition() -> ModuleDefinition {
    Name("MetaGlasses")

    Events(
      "onRegistrationStateChange",
      "onDevicesChange",
      "onDeviceLinkStateChange",
      "onStreamStateChange",
      "onVideoFrame",
      "onPhotoCapture",
      "onError"
    )

    // ─── SDK Lifecycle ────────────────────────────────────────────

    AsyncFunction("configure") { () -> [String: Any] in
#if canImport(MWDATCore)
      if self.isConfigured {
        return ["status": "already_configured"]
      }
      do {
        try Wearables.configure()
        self.isConfigured = true
        self.startListeningForRegistrationState()
        self.startListeningForDevices()
        return ["status": "configured"]
      } catch {
        throw Exception(name: "ConfigureError", description: "Failed to configure DAT SDK: \(error)")
      }
#else
      return ["status": "unavailable", "reason": "DAT SDK not linked"]
#endif
    }

    // ─── Registration (connects to Meta AI app) ──────────────────

    AsyncFunction("startRegistration") { () -> [String: Any] in
#if canImport(MWDATCore)
      guard self.isConfigured else {
        throw Exception(name: "NotConfigured", description: "Call configure() first")
      }
      do {
        try await Wearables.shared.startRegistration()
        return ["status": "registration_started"]
      } catch {
        throw Exception(name: "RegistrationError", description: "\(error)")
      }
#else
      return ["status": "unavailable", "reason": "DAT SDK not linked"]
#endif
    }

    AsyncFunction("handleUrl") { (urlString: String) -> Bool in
#if canImport(MWDATCore)
      guard self.isConfigured, let url = URL(string: urlString) else {
        return false
      }
      guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
            components.queryItems?.contains(where: { $0.name == "metaWearablesAction" }) == true
      else {
        return false
      }
      do {
        return try await Wearables.shared.handleUrl(url)
      } catch {
        self.sendEvent("onError", ["error": "handleUrl failed: \(error)"])
        return false
      }
#else
      return false
#endif
    }

    AsyncFunction("unregister") { () -> [String: Any] in
#if canImport(MWDATCore)
      guard self.isConfigured else {
        throw Exception(name: "NotConfigured", description: "Call configure() first")
      }
      do {
        try await Wearables.shared.startUnregistration()
        return ["status": "unregistered"]
      } catch {
        throw Exception(name: "UnregistrationError", description: "\(error)")
      }
#else
      return ["status": "unavailable", "reason": "DAT SDK not linked"]
#endif
    }

    Function("getRegistrationState") { () -> String in
#if canImport(MWDATCore)
      guard self.isConfigured else { return "unavailable" }
      return self.registrationStateString(Wearables.shared.registrationState)
#else
      return "unavailable"
#endif
    }

    // ─── Device Discovery ────────────────────────────────────────

    Function("getDevices") { () -> [[String: Any]] in
#if canImport(MWDATCore)
      guard self.isConfigured else { return [] }
      return Wearables.shared.devices.compactMap { id in
        guard let device = Wearables.shared.deviceForIdentifier(id) else { return nil }
        return self.deviceToDict(device)
      }
#else
      return []
#endif
    }

    // ─── Permissions ─────────────────────────────────────────────

    AsyncFunction("checkCameraPermission") { () -> String in
#if canImport(MWDATCore)
      guard self.isConfigured else {
        throw Exception(name: "NotConfigured", description: "Call configure() first")
      }
      do {
        let status = try await Wearables.shared.checkPermissionStatus(.camera)
        return status == .granted ? "granted" : "denied"
      } catch {
        throw Exception(name: "PermissionError", description: "\(error)")
      }
#else
      return "denied"
#endif
    }

    AsyncFunction("requestCameraPermission") { () -> String in
#if canImport(MWDATCore)
      guard self.isConfigured else {
        throw Exception(name: "NotConfigured", description: "Call configure() first")
      }
      do {
        let status = try await Wearables.shared.requestPermission(.camera)
        return status == .granted ? "granted" : "denied"
      } catch {
        throw Exception(name: "PermissionError", description: "\(error)")
      }
#else
      return "denied"
#endif
    }

    // ─── Camera Streaming ────────────────────────────────────────

    AsyncFunction("startStreaming") { (options: [String: Any]?) -> [String: Any] in
#if canImport(MWDATCamera)
      guard self.isConfigured else {
        throw Exception(name: "NotConfigured", description: "Call configure() first")
      }

      let resolutionStr = options?["resolution"] as? String ?? "low"
      let frameRate = options?["frameRate"] as? UInt ?? 24
      let throttle = options?["throttleSeconds"] as? Double ?? 1.0

      let resolution: StreamingResolution
      switch resolutionStr {
      case "high": resolution = .high
      case "medium": resolution = .medium
      default: resolution = .low
      }

      self.frameThrottleInterval = throttle

      let wearables = Wearables.shared
      let selector = AutoDeviceSelector(wearables: wearables)
      self.deviceSelector = selector

      let config = StreamSessionConfig(
        videoCodec: .raw,
        resolution: resolution,
        frameRate: frameRate
      )

      await MainActor.run {
        let session = StreamSession(streamSessionConfig: config, deviceSelector: selector)
        self.streamSession = session
        self.subscribeToStreamEvents(session)
        Task {
          await session.start()
        }
      }

      return ["status": "streaming_started", "resolution": resolutionStr, "frameRate": Int(frameRate)]
#else
      return ["status": "unavailable", "reason": "DAT Camera SDK not linked"]
#endif
    }

    AsyncFunction("stopStreaming") { () -> [String: Any] in
#if canImport(MWDATCamera)
      guard let session = self.streamSession else {
        return ["status": "not_streaming"]
      }
      await MainActor.run {
        Task {
          await session.stop()
        }
      }
      self.cleanupStream()
      return ["status": "stopped"]
#else
      return ["status": "unavailable"]
#endif
    }

    // ─── Photo Capture ───────────────────────────────────────────

    Function("capturePhoto") { (format: String?) -> Bool in
#if canImport(MWDATCamera)
      guard let session = self.streamSession else { return false }
      let photoFormat: PhotoCaptureFormat = format == "heic" ? .heic : .jpeg
      return session.capturePhoto(format: photoFormat)
#else
      return false
#endif
    }

    // ─── Cleanup ─────────────────────────────────────────────────

    OnDestroy {
#if canImport(MWDATCamera)
      self.cleanupStream()
#endif
#if canImport(MWDATCore)
      self.registrationToken = nil
      self.devicesToken = nil
      self.linkStateTokens.removeAll()
#endif
    }
  }

  // MARK: - Private Helpers (SDK-dependent)

#if canImport(MWDATCore)
  private func startListeningForRegistrationState() {
    let token = Wearables.shared.addRegistrationStateListener { [weak self] state in
      self?.sendEvent("onRegistrationStateChange", [
        "state": self?.registrationStateString(state) ?? "unknown"
      ])
    }
    registrationToken = token as AnyObject
  }

  private func startListeningForDevices() {
    let token = Wearables.shared.addDevicesListener { [weak self] deviceIds in
      guard let self = self else { return }
      let devices = deviceIds.compactMap { id -> [String: Any]? in
        guard let device = Wearables.shared.deviceForIdentifier(id) else { return nil }
        return self.deviceToDict(device)
      }
      self.sendEvent("onDevicesChange", ["devices": devices])

      self.linkStateTokens.removeAll()
      for id in deviceIds {
        guard let device = Wearables.shared.deviceForIdentifier(id) else { continue }
        let linkToken = device.addLinkStateListener { [weak self] linkState in
          self?.sendEvent("onDeviceLinkStateChange", [
            "deviceId": id,
            "deviceName": device.nameOrId(),
            "linkState": self?.linkStateString(linkState) ?? "unknown"
          ])
        }
        self.linkStateTokens.append(linkToken as AnyObject)
      }
    }
    devicesToken = token as AnyObject
  }

  private func deviceToDict(_ device: Device) -> [String: Any] {
    return [
      "id": device.identifier,
      "name": device.nameOrId(),
      "type": deviceTypeString(device.deviceType()),
      "linkState": linkStateString(device.linkState),
      "compatibility": compatibilityString(device.compatibility()),
    ]
  }

  private func registrationStateString(_ state: RegistrationState) -> String {
    switch state {
    case .unavailable: return "unavailable"
    case .available: return "available"
    case .registering: return "registering"
    case .registered: return "registered"
    @unknown default: return "unknown"
    }
  }

  private func linkStateString(_ state: LinkState) -> String {
    switch state {
    case .disconnected: return "disconnected"
    case .connecting: return "connecting"
    case .connected: return "connected"
    @unknown default: return "unknown"
    }
  }

  private func deviceTypeString(_ type: DeviceType) -> String {
    switch type {
    case .rayBanMeta: return "ray_ban_meta"
    case .oakleyMetaHSTN: return "oakley_meta_hstn"
    case .oakleyMetaVanguard: return "oakley_meta_vanguard"
    case .metaRayBanDisplay: return "meta_ray_ban_display"
    case .unknown: return "unknown"
    @unknown default: return "unknown"
    }
  }

  private func compatibilityString(_ compat: Compatibility) -> String {
    switch compat {
    case .compatible: return "compatible"
    case .deviceUpdateRequired: return "device_update_required"
    case .sdkUpdateRequired: return "sdk_update_required"
    case .undefined: return "undefined"
    @unknown default: return "unknown"
    }
  }
#endif

#if canImport(MWDATCamera)
  @MainActor
  private func subscribeToStreamEvents(_ session: StreamSession) {
    videoFrameToken = session.videoFramePublisher.listen { [weak self] videoFrame in
      guard let self = self else { return }
      let now = ProcessInfo.processInfo.systemUptime
      guard now - self.lastFrameSentTime >= self.frameThrottleInterval else { return }
      self.lastFrameSentTime = now

      Task { @MainActor in
        if let image = videoFrame.makeUIImage(),
           let jpegData = image.jpegData(compressionQuality: 0.5) {
          let base64 = jpegData.base64EncodedString()
          self.sendEvent("onVideoFrame", [
            "base64": base64,
            "width": Int(image.size.width),
            "height": Int(image.size.height),
            "timestamp": now
          ])
        }
      }
    } as AnyObject

    photoDataToken = session.photoDataPublisher.listen { [weak self] photoData in
      let base64 = photoData.data.base64EncodedString()
      self?.sendEvent("onPhotoCapture", [
        "base64": base64,
        "format": photoData.format == .heic ? "heic" : "jpeg"
      ])
    } as AnyObject

    stateToken = session.statePublisher.listen { [weak self] state in
      self?.sendEvent("onStreamStateChange", [
        "state": self?.streamStateString(state) ?? "unknown"
      ])
    } as AnyObject

    errorToken = session.errorPublisher.listen { [weak self] error in
      self?.sendEvent("onError", [
        "error": "\(error)",
        "source": "stream"
      ])
    } as AnyObject
  }

  private func cleanupStream() {
    videoFrameToken = nil
    photoDataToken = nil
    stateToken = nil
    errorToken = nil
    streamSession = nil
    deviceSelector = nil
    lastFrameSentTime = 0
  }

  private func streamStateString(_ state: StreamSessionState) -> String {
    switch state {
    case .stopping: return "stopping"
    case .stopped: return "stopped"
    case .waitingForDevice: return "waiting_for_device"
    case .starting: return "starting"
    case .streaming: return "streaming"
    case .paused: return "paused"
    @unknown default: return "unknown"
    }
  }
#endif
}
