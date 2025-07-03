package so.clix

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class ClixPackage : TurboReactPackage() {
    override fun getModule(name: String, context: ReactApplicationContext): NativeModule? {
        return if (name == "Clix") {
            ClixTurboModule(context)
        } else null
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            mapOf(
                "Clix" to ReactModuleInfo(
                    _name = "Clix",
                    _className = "Clix",
                    _canOverrideExistingModule = false,
                    _needsEagerInit = false,
                    isCxxModule = false,
                    isTurboModule = true,
                )
            )
        }
    }
}
