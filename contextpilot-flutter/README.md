# ContextPilot mobile app

## Test setup

From this directory, install dependencies and build a test APK:

```sh
flutter pub get
flutter test
flutter build apk --debug
```

Install `build/app/outputs/flutter-apk/app-debug.apk` on an Android device. Start the laptop agent in `../contextpilot-npm` with `npm install && npm run dev`; scan its QR code from the app. On Windows, follow the firewall command printed by the agent.

Mock mode is available only in debug/profile builds and is clearly marked in the UI. Release builds cannot enable it.

A few resources to get you started if this is your first Flutter project:

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.
