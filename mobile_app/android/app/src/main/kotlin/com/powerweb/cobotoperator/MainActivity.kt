package com.powerweb.cobotoperator

import android.content.Intent
import android.content.pm.LabeledIntent
import android.content.pm.PackageManager
import android.net.Uri
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.powerweb.cobotoperator/navigation"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                // Show the system "Open with" picker constrained to Google
                // Maps and Waze. Each entry fires a package-specific
                // navigation intent so picking either starts turn-by-turn
                // directions instead of just dropping a pin.
                "openNavigationChooser" -> {
                    val lat = call.argument<Double>("lat")
                    val lng = call.argument<Double>("lng")
                    val label = call.argument<String>("label") ?: "Destination"
                    if (lat == null || lng == null) {
                        result.success(false)
                        return@setMethodCallHandler
                    }
                    try {
                        val ok = launchNavigationChooser(lat, lng, label)
                        result.success(ok)
                    } catch (e: Exception) {
                        result.success(false)
                    }
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun launchNavigationChooser(lat: Double, lng: Double, label: String): Boolean {
        val pm = packageManager

        data class Candidate(val pkg: String, val intent: Intent)
        val candidates = listOf(
            Candidate(
                "com.google.android.apps.maps",
                Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=$lat,$lng&mode=d")),
            ),
            Candidate(
                "com.waze",
                // Universal-link form — more reliable than the waze://
                // deep link on recent Waze builds.
                Intent(Intent.ACTION_VIEW, Uri.parse("https://www.waze.com/ul?ll=$lat%2C$lng&navigate=yes&zoom=17")),
            ),
        )

        val navIntents = mutableListOf<LabeledIntent>()
        for (c in candidates) {
            if (!isInstalled(pm, c.pkg)) continue
            val info = try {
                pm.getApplicationInfo(c.pkg, 0)
            } catch (_: PackageManager.NameNotFoundException) {
                continue
            }
            val intent = Intent(c.intent).setPackage(c.pkg)
            navIntents.add(LabeledIntent(intent, c.pkg, pm.getApplicationLabel(info), info.icon))
        }

        if (navIntents.isEmpty()) return false

        val primary = Intent(navIntents[0])
        val chooser = Intent.createChooser(primary, "Navigate with").apply {
            if (navIntents.size > 1) {
                val rest = navIntents.subList(1, navIntents.size).toTypedArray<LabeledIntent>()
                putExtra(Intent.EXTRA_INITIAL_INTENTS, rest)
            }
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        startActivity(chooser)
        return true
    }

    private fun isInstalled(pm: PackageManager, pkg: String) = try {
        pm.getPackageInfo(pkg, 0); true
    } catch (_: PackageManager.NameNotFoundException) {
        false
    }
}
