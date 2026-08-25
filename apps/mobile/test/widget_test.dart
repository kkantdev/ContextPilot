import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:contextpilot/main.dart';

void main() {
  testWidgets('App renders splash screen cleanly', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: ContextPilotApp()));

    expect(find.text('ContextPilot'), findsOneWidget);
    await tester.pumpAndSettle(const Duration(seconds: 3));
  });
}
