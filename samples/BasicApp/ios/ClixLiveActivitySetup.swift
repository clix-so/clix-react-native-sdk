import Foundation
import clix_react_native_sdk

@objc public class ClixLiveActivitySetup: NSObject {
  @objc public static func setup() {
    if #available(iOS 16.1, *) {
      ClixLiveActivity.setup(DeliveryActivityAttributes.self)
    }
  }
}
