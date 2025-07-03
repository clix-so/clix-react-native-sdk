package so.clix

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

@ReactModule(name = ClixNativeModule.NAME)
class ClixNativeModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    private val module: ClixModule = ClixModule(context)

    @ReactMethod
    override fun getName(): String = NAME

    companion object {
        const val NAME = "Clix"
    }
}
