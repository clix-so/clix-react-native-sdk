import Clix
import UserNotifications

/// NotificationService inherits all logic from ClixNotificationServiceExtension
/// No additional logic is needed unless you want to customize notification handling.
class NotificationService: ClixNotificationServiceExtension {
    // Initialize with your Clix project ID
    override init() {
        super.init()
        // Register your Clix project ID
        register(projectId: "5dbdd10e-6ea6-4ff7-836d-bd30a6d1a521")
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
}
