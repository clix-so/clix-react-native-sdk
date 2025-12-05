import Clix
import Foundation
import UserNotifications

/// NotificationService inherits all logic from ClixNotificationServiceExtension
/// No additional logic is needed unless you want to customize notification handling.
class NotificationService: ClixNotificationServiceExtension {
    // Initialize with your Clix project ID
    override init() {
        super.init()
        // Register your Clix project ID
        register(projectId: loadProjectId())
    }

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        // Call super to handle image downloading and send push received event
        super.didReceive(request, withContentHandler: contentHandler)
    }

    override func serviceExtensionTimeWillExpire() {
        super.serviceExtensionTimeWillExpire()
    }

    private func loadProjectId() -> String {
        guard let configURL = Bundle.main.url(forResource: "clix_config", withExtension: "json") else {
            fatalError("clix_config.json missing from Notification Extension bundle.")
        }

        guard
            let data = try? Data(contentsOf: configURL),
            let payload = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
            let projectId = payload["projectId"] as? String,
            projectId.isEmpty == false
        else {
            fatalError("projectId missing in clix_config.json.")
        }

        return projectId
    }
}
