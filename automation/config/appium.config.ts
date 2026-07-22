import path from 'path';

export const AppiumConfig = {
  hostname: '127.0.0.1',
  port: 4723,
  path: '/',
  capabilities: {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'Android Emulator',
    'appium:app': path.resolve(__dirname, '../../frontend/android/app/build/outputs/apk/debug/app-debug.apk'),
    'appium:noReset': false,
    'appium:fullReset': false,
    'appium:newCommandTimeout': 300,
    'appium:autoGrantPermissions': true,
    'appium:avd': 'Pixel_6_API_33',
    'appium:avdLaunchTimeout': 180000,
    'appium:avdReadyTimeout': 180000
  },
  connectionRetryCount: 3,
  connectionRetryTimeout: 90000
};
