import Foundation

#if canImport(ActivityKit)
import ActivityKit
#endif

/// Public API for LiveActivity setup. Use this from your AppDelegate.
public class ClixLiveActivity: NSObject {

  #if canImport(ActivityKit)
  /// Starts listening for push-to-start tokens. Call this from AppDelegate.
  /// - Parameter activityType: The ActivityAttributes type to listen for
  @available(iOS 16.1, *)
  public static func setup<Attributes: ActivityAttributes>(_ activityType: Attributes.Type) {
    ClixLiveActivityModule.setup(activityType)
  }
  #endif
}
