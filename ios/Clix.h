#ifdef RCT_NEW_ARCH_ENABLED
#import "RNClixSpec.h"

@interface Clix : NSObject <NativeClixSpec>
#else
#import <React/RCTBridgeModule.h>

@interface Clix : NSObject <RCTBridgeModule>
#endif

@end