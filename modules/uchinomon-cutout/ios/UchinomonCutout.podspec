Pod::Spec.new do |s|
  s.name           = 'UchinomonCutout'
  s.version        = '1.0.0'
  s.summary        = 'On-device foreground cutout (Vision) for うちのモン'
  s.description    = 'Runs VNGenerateForegroundInstanceMaskRequest fully on device, no network.'
  s.author         = 'Starving Effort'
  s.homepage       = 'https://docs.expo.dev/modules/'
  # Must be <= the app's iOS deployment target (16.4), or Expo autolinking
  # SILENTLY skips this module ("requires iOS 17.0 but app targets 16.4") and
  # requireNativeModule('UchinomonCutout') throws at launch -> RCTFatal crash.
  # The iOS 17+ Vision APIs are all guarded with @available(iOS 17.0, *) /
  # if #available, so a 16.4 deployment target compiles and runs safely
  # (isSupported() returns false below iOS 17).
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
