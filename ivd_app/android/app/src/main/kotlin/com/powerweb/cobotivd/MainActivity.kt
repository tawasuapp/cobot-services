package com.powerweb.cobotivd

import android.content.Intent
import android.net.Uri
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.powerweb.cobotivd/navigation"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            if (call.method == "openGoogleMapsNavigation") {
                val lat = call.argument<Double>("lat")
                val lng = call.argument<Double>("lng")
                if (lat != null && lng != null) {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=$lat,$lng&mode=d"))
                        intent.setPackage("com.google.android.apps.maps")
                        startActivity(intent)
                        result.success(true)
                    } catch (e: Exception) {
                        result.success(false)
                    }
                } else {
                    result.success(false)
                }
            } else {
                result.notImplemented()
            }
        }
    }
}
