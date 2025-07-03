package so.clix

import com.facebook.react.bridge.ReactApplicationContext

class ClixTurboModule(context: ReactApplicationContext) : NativeClixSpec(context) {
    private val module: ClixModule = ClixModule(context)
}
