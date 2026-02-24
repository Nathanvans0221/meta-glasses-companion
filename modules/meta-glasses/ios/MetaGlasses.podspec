Pod::Spec.new do |s|
  s.name           = 'MetaGlasses'
  s.version        = '1.0.0'
  s.summary        = 'Meta Wearables DAT SDK bridge for React Native'
  s.description    = 'Expo native module wrapping Meta Wearables Device Access Toolkit for glasses camera and device management'
  s.homepage       = 'https://github.com/Nathanvans0221/meta-glasses-companion'
  s.license        = 'MIT'
  s.author         = 'Silver Fern'
  s.platform       = :ios, '15.2'
  s.source         = { git: '' }
  s.source_files   = '**/*.swift'
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'
end
