Pod::Spec.new do |s|
  s.name           = 'UchinomonCutout'
  s.version        = '1.0.0'
  s.summary        = 'On-device foreground cutout (Vision) for うちのモン'
  s.description    = 'Runs VNGenerateForegroundInstanceMaskRequest fully on device, no network.'
  s.author         = 'Starving Effort'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '17.0'
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
