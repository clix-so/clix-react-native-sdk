#import <Foundation/Foundation.h>
#import "ClixAppGroupDirectory.h"
#import <React/RCTLog.h>

@implementation ClixAppGroupDirectory

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

static NSString *const kClixDefaultBundleIdentifier = @"com.clix.default";
static NSString *const kClixAppGroupPrefix = @"group.clix.";

+ (NSString *)resolvePrimaryBundleIdentifier
{
  static NSString *cachedIdentifier = nil;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    NSString *bundleIdentifier = [[NSBundle mainBundle] bundleIdentifier];
    if (bundleIdentifier == nil || bundleIdentifier.length == 0) {
      id infoValue =
          [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleIdentifier"];
      if ([infoValue isKindOfClass:[NSString class]]) {
        NSString *value = (NSString *)infoValue;
        if (value.length > 0) {
          bundleIdentifier = value;
        }
      }
    }

    if (bundleIdentifier == nil || bundleIdentifier.length == 0) {
      bundleIdentifier = kClixDefaultBundleIdentifier;
    }

    cachedIdentifier = bundleIdentifier;
  });

  return cachedIdentifier;
}

+ (NSString *)bundleIdBasedAppGroupId:(NSString *)bundleIdentifier
{
  if (bundleIdentifier == nil || bundleIdentifier.length == 0) {
    return nil;
  }

  return [NSString stringWithFormat:@"%@%@", kClixAppGroupPrefix, bundleIdentifier];
}

+ (NSString *)resolveAppGroupIdentifier
{
  NSString *bundleIdentifier = [ClixAppGroupDirectory resolvePrimaryBundleIdentifier];
  return [ClixAppGroupDirectory bundleIdBasedAppGroupId:bundleIdentifier];
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getAppGroupDirectory)
{
  NSString *identifier = [ClixAppGroupDirectory resolveAppGroupIdentifier];
  if (identifier == nil || identifier.length == 0) {
    return nil;
  }

  NSURL *url = [[NSFileManager defaultManager] containerURLForSecurityApplicationGroupIdentifier:identifier];
  if (url == nil) {
    RCTLogWarn(@"[Clix] Failed to resolve App Group path for identifier '%@'. Check your entitlements and make sure the group exists.", identifier);
    return nil;
  }

  return url.path;
}

@end
