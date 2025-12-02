require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = 'clix-react-native-sdk'
  s.version      = package['version']
  s.summary      = package['description'] || 'Clix React Native SDK'
  s.description  = package['description'] || 'Clix React Native SDK'
  s.homepage     = package['homepage']
  s.license      = { :type => package['license'], :text => 'See LICENSE file' }
  s.author       = package['author']
  s.platform     = :ios, '14.0'
  s.source       = { :git => 'https://github.com/clix-so/clix-react-native-sdk.git', :tag => "v#{package['version']}" }
  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.requires_arc = true

  s.dependency 'React-Core'
end
