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
            when (call.method) {
                // Legacy: fires Google Maps directly, bypassing the chooser.
                // Kept for callers that still use it.
                "openGoogleMapsNavigation" -> {
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
                }
                // New: forces the system "Open with" picker so the driver can
                // choose between Google Maps, Waze, or any other installed
                // navigation app. Picked app receives a destination intent
                // (not just a pin) and starts directions immediately.
                "openNavigationChooser" -> {
                    val lat = call.argument<Double>("lat")
                    val lng = call.argument<Double>("lng")
                    val label = call.argument<String>("label") ?: "Destination"
                    if (lat != null && lng != null) {
                        try {
                            // geo:LAT,LNG?q=LAT,LNG(Label) is the most widely
                            // supported form. Both Google Maps and Waze
                            // register for it and start navigation rather
                            // than only showing the pin.
                            val encodedLabel = Uri.encode(label)
                            val uri = Uri.parse("geo:$lat,$lng?q=$lat,$lng($encodedLabel)")
                            val viewIntent = Intent(Intent.ACTION_VIEW, uri)
                            val chooser = Intent.createChooser(viewIntent, "Open with")
                            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            startActivity(chooser)
                            result.success(true)
                        } catch (e: Exception) {
                            result.success(false)
                        }
                    } else {
                        result.success(false)
                    }
                }
                else -> result.notImplemented()
            }
        }
    }
}
