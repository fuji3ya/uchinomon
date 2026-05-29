package app.starvingeffort.uchinomon.cutout

import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Android has no on-device Vision foreground mask. うちのモン ships iOS-only;
// this stub keeps Android bundling alive without claiming support.
class UchinomonCutoutModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("UchinomonCutout")

    Function("isSupported") {
      false
    }

    AsyncFunction("cutoutForeground") { _: String ->
      throw CodedException("UNSUPPORTED_OS", "UchinomonCutout は iOS せんようです。", null)
    }
  }
}
