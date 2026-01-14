import Foundation
import React

#if canImport(ActivityKit)
import ActivityKit
#endif

@objc(ClixLiveActivityModule)
class ClixLiveActivityModule: RCTEventEmitter {

  private static var sharedInstance: ClixLiveActivityModule?
  private static var pendingSetups: [() -> Void] = []
  private var hasListeners = false
  private var activeListeners: Set<String> = []
  private var pendingTokens: [(activityType: String, token: String)] = []

  override init() {
    super.init()
    ClixLiveActivityModule.sharedInstance = self

    // Execute any pending setups that were called before the module was initialized
    for pendingSetup in ClixLiveActivityModule.pendingSetups {
      pendingSetup()
    }
    ClixLiveActivityModule.pendingSetups.removeAll()
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  override func supportedEvents() -> [String]! {
    return ["onPushToStartToken"]
  }

  override func startObserving() {
    hasListeners = true
    // Send any pending tokens
    for pending in pendingTokens {
      sendEvent(withName: "onPushToStartToken", body: [
        "activityType": pending.activityType,
        "token": pending.token
      ])
    }
    pendingTokens.removeAll()
  }

  override func stopObserving() {
    hasListeners = false
  }

  #if canImport(ActivityKit)
  /// Starts listening for push-to-start tokens. Call this from AppDelegate.
  /// - Parameter activityType: The ActivityAttributes type to listen for
  @available(iOS 16.1, *)
  public static func setup<Attributes: ActivityAttributes>(_ activityType: Attributes.Type) {
    guard #available(iOS 17.2, *) else {
      print("[Clix] LiveActivity pushToStartToken requires iOS 17.2+")
      return
    }

    let activityTypeName = String(describing: Attributes.self)

    guard let instance = sharedInstance else {
      // Store setup for later execution when the module is initialized
      pendingSetups.append {
        setup(activityType)
      }
      print("[Clix] ClixLiveActivityModule not ready yet. Setup will be executed when ready.")
      return
    }

    instance.startListening(activityType, activityTypeName: activityTypeName)
  }

  @available(iOS 17.2, *)
  private func startListening<Attributes: ActivityAttributes>(
    _ activityType: Attributes.Type,
    activityTypeName: String
  ) {
    guard !activeListeners.contains(activityTypeName) else {
      print("[Clix] Already listening for pushToStartToken: \(activityTypeName)")
      return
    }

    activeListeners.insert(activityTypeName)
    print("[Clix] Starting pushToStartToken listener: \(activityTypeName)")

    Task {
      for await tokenData in Activity<Attributes>.pushToStartTokenUpdates {
        let token = tokenData.map { String(format: "%02x", $0) }.joined()
        print("[Clix] Received pushToStartToken for \(activityTypeName): \(token)")

        await MainActor.run {
          self.emitToken(activityType: activityTypeName, token: token)
        }
      }
    }
  }
  #endif

  private func emitToken(activityType: String, token: String) {
    let body: [String: Any] = [
      "activityType": activityType,
      "token": token
    ]

    if hasListeners {
      sendEvent(withName: "onPushToStartToken", body: body)
    } else {
      pendingTokens.append((activityType: activityType, token: token))
    }
  }
}
