package com.powerweb.cobotivd

import android.content.Intent
import android.content.pm.LabeledIntent
import android.content.pm.PackageManager
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
     * Show the system "Open with" chooser, but with per-app *navigation*
     * intents (not just view-location). Each entry in the chooser fires a
     * package-specific intent that starts turn-by-turn directions.
     *
     * We build the list from a known whitelist of nav apps (Google Maps,
     * Waze, HERE) rather than relying on `queryIntentActivities(geo:)`.
     * That probe sometimes misses Waze on devices where it hasn't yet
     * re-registered its filters, or drops it when the chooser filters
     * duplicates. Whitelisting guarantees it appears whenever installed.
     */
    private fun launchNavigationChooser(lat: Double, lng: Double, label: String): Boolean {
        val pm = packageManager
        // Targeted to Google Maps and Waze only — no generic geo: fallbacks
        // so drivers never see Uber / Earth / Lyft / etc. in the picker.

        data class Candidate(val pkg: String, val intent: Intent)
        val candidates = listOf(
            Candidate(
                "com.google.android.apps.maps",
                Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=$lat,$lng&mode=d")),
            ),
            Candidate(
                // Universal link form. The `waze://?ll=…` deep link
                // intermittently produced "couldn't calculate route" on
                // recent Waze builds. The https form is handled by the
                // same activity filter and routes reliably.
                "com.waze",
                Intent(Intent.ACTION_VIEW, Uri.parse("https://www.waze.com/ul?ll=$lat%2C$lng&navigate=yes&zoom=17")),
            ),
        )

        val navIntents = mutableListOf<LabeledIntent>()
        for (c in candidates) {
            if (!isPackageInstalled(pm, c.pkg)) continue
            val appInfo = try {
                pm.getApplicationInfo(c.pkg, 0)
            } catch (_: PackageManager.NameNotFoundException) {
                continue
            }
            val appLabel = pm.getApplicationLabel(appInfo)
            val appIcon = appInfo.icon
            val intent = Intent(c.intent).setPackage(c.pkg)
            navIntents.add(LabeledIntent(intent, c.pkg, appLabel, appIcon))
        }

        if (navIntents.isEmpty()) return false

        // Use a dummy primary that no app handles so the chooser shows
        // *only* our curated list (no duplicated geo: entries that would
        // open a pin instead of directions).
        val primary = if (navIntents.size == 1) {
            Intent(navIntents[0])
        } else {
            Intent(navIntents[0]).also {
                // Promote the first entry as primary; the rest go into
                // EXTRA_INITIAL_INTENTS.
            }
        }

        val chooser = Intent.createChooser(primary, "Open with").apply {
            if (navIntents.size > 1) {
                val rest = navIntents.subList(1, navIntents.size).toTypedArray<LabeledIntent>()
                putExtra(Intent.EXTRA_INITIAL_INTENTS, rest)
            }
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        startActivity(chooser)
        return true
    }

    private fun isPackageInstalled(pm: PackageManager, pkg: String): Boolean = try {
        pm.getPackageInfo(pkg, 0)
        true
    } catch (_: PackageManager.NameNotFoundException) {
        false
    }
}
