#import "Clix.h"

@implementation Clix
RCT_EXPORT_MODULE()

// Example method for Old Architecture
RCT_EXPORT_METHOD(multiply:(double)a b:(double)b
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    NSNumber *result = @(a * b);
    resolve(result);
}

#ifdef RCT_NEW_ARCH_ENABLED
// Synchronous method for New Architecture
- (NSNumber *)multiply:(double)a b:(double)b {
    NSNumber *result = @(a * b);
    return result;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeClixSpecJSI>(params);
}
#endif

@end
