package com.powerweb.cobotivd

import android.content.Intent
import android.content.pm.LabeledIntent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
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

                // Build per-app NAVIGATION intents (not just view-location) and
                // surface them in the system "Open with" chooser. Whichever
                // app the driver picks receives an intent that starts
                // turn-by-turn directions immediately.
                "openNavigationChooser" -> {
                    val lat = call.argument<Double>("lat")
                    val lng = call.argument<Double>("lng")
                    val label = call.argument<String>("label") ?: "Destination"
                    if (lat == null || lng == null) {
                        result.success(false)
                        return@setMethodCallHandler
                    }
                    try {
                        val launched = launchNavigationChooser(lat, lng, label)
                        result.success(launched)
                    } catch (e: Exception) {
                        result.success(false)
                    }
                }

                else -> result.notImplemented()
            }
        }
    }

    /**
     * Resolve installed map apps that can handle a geo: URI, then for each
     * build a package-specific *navigation* intent (Google Maps'
     * `google.navigation:`, Waze's `waze://…&navigate=yes`, …). Present them
     * via Intent.createChooser with EXTRA_INITIAL_INTENTS so the user sees
     * the native "Open with" sheet but every option starts directions
     * instead of just dropping a pin.
     */
    private fun launchNavigationChooser(lat: Double, lng: Double, label: String): Boolean {
        val pm = packageManager
        val encodedLabel = Uri.encode(label)
        // Probe intent — what resolves for "show this location".
        val geoProbe = Intent(Intent.ACTION_VIEW, Uri.parse("geo:$lat,$lng?q=$lat,$lng($encodedLabel)"))
        val resolved: List<ResolveInfo> = pm.queryIntentActivities(geoProbe, 0)
        if (resolved.isEmpty()) return false

        val navIntents = mutableListOf<LabeledIntent>()
        val seen = mutableSetOf<String>()

        for (info in resolved) {
            val pkg = info.activityInfo.packageName
            if (!seen.add(pkg)) continue
            val navIntent = buildNavIntentForPackage(pkg, lat, lng, encodedLabel) ?: continue
            val appLabel = info.loadLabel(pm)
            val appIcon = info.activityInfo.applicationInfo.icon
            navIntents.add(LabeledIntent(navIntent, pkg, appLabel, appIcon))
        }

        if (navIntents.isEmpty()) return false

        // Use the first entry as the "primary" but restrict it to its own
        // package so the chooser doesn't duplicate options from the probe.
        val primary = Intent(navIntents[0])
        val extras = if (navIntents.size > 1) navIntents.subList(1, navIntents.size).toTypedArray() else emptyArray()

        val chooser = Intent.createChooser(primary, "Open with").apply {
            if (extras.isNotEmpty()) putExtra(Intent.EXTRA_INITIAL_INTENTS, extras)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        startActivity(chooser)
        return true
    }

    /**
     * Map package name → an intent that starts turn-by-turn navigation in
     * that specific app. For unknown packages we fall back to a geo: view
     * intent (the app will at least receive the destination coordinates).
     */
    private fun buildNavIntentForPackage(
        pkg: String,
        lat: Double,
        lng: Double,
        encodedLabel: String,
    ): Intent? = when (pkg) {
        "com.google.android.apps.maps" -> Intent(
            Intent.ACTION_VIEW,
            Uri.parse("google.navigation:q=$lat,$lng&mode=d"),
        ).setPackage(pkg)

        "com.waze" -> Intent(
            Intent.ACTION_VIEW,
            Uri.parse("waze://?ll=$lat,$lng&navigate=yes"),
        ).setPackage(pkg)

        // HERE WeGo starts navigation on this scheme.
        "com.here.app.maps" -> Intent(
            Intent.ACTION_VIEW,
            Uri.parse("here.directions://v1.0/mylocation/$lat,$lng"),
        ).setPackage(pkg)

        // Organic Maps / other OSM forks — geo with navigation flag.
        else -> Intent(
            Intent.ACTION_VIEW,
            Uri.parse("geo:$lat,$lng?q=$lat,$lng($encodedLabel)&mode=d"),
        ).setPackage(pkg)
    }
}
