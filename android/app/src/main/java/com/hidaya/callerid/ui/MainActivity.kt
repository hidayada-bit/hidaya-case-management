package com.hidaya.callerid.ui

import android.Manifest
import android.app.role.RoleManager
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.lifecycleScope
import com.hidaya.callerid.data.AppDb
import com.hidaya.callerid.data.CallerInfo
import com.hidaya.callerid.data.FamilyInfo
import com.hidaya.callerid.data.PairingToken
import com.hidaya.callerid.data.Prefs
import com.hidaya.callerid.data.SyncRepository
import com.hidaya.callerid.data.SyncResult
import com.hidaya.callerid.overlay.OverlayController
import kotlinx.coroutines.launch

fun relativeTime(ms: Long): String {
    val mins = (System.currentTimeMillis() - ms) / 60_000
    return when {
        mins < 1 -> "just now"
        mins < 60 -> "$mins min ago"
        mins < 60 * 24 -> "${mins / 60} h ago"
        else -> "${mins / (60 * 24)} d ago"
    }
}

private data class UiState(
    val paired: Boolean = false,
    val revoked: Boolean = false,
    val hasRole: Boolean = false,
    val canOverlay: Boolean = false,
    val hasPhonePerms: Boolean = false,
    val hasNotif: Boolean = true,
    val lastSync: Long = 0,
    val callers: Int = 0,
    val busy: Boolean = false,
    val message: String? = null,
)

class MainActivity : ComponentActivity() {
    private var state by mutableStateOf(UiState())

    private val roleLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { refresh() }
    private val permLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { refresh() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // HDA brand colours: green #1E7D22, dark green #145717, gold #F5A800, light green #E8F5E9, red #DC2626
        val hda = lightColorScheme(
            primary = Color(0xFF1E7D22), onPrimary = Color.White,
            primaryContainer = Color(0xFFE8F5E9), onPrimaryContainer = Color(0xFF145717),
            secondary = Color(0xFFF5A800), onSecondary = Color(0xFF1A1A1A),
            surface = Color.White, background = Color.White,
            error = Color(0xFFDC2626),
        )
        setContent { MaterialTheme(colorScheme = hda) { Surface { Screen() } } }
    }

    override fun onResume() {
        super.onResume()
        refresh()
    }

    private fun granted(p: String) = checkSelfPermission(p) == PackageManager.PERMISSION_GRANTED

    private fun refresh() {
        val prefs = Prefs.get(this)
        val rm = getSystemService(RoleManager::class.java)
        lifecycleScope.launch {
            val count = AppDb.get(this@MainActivity).dao().count()
            state = state.copy(
                paired = prefs.paired,
                revoked = prefs.revoked,
                hasRole = rm.isRoleAvailable(RoleManager.ROLE_CALL_SCREENING) &&
                    rm.isRoleHeld(RoleManager.ROLE_CALL_SCREENING),
                canOverlay = Settings.canDrawOverlays(this@MainActivity),
                hasPhonePerms = granted(Manifest.permission.READ_PHONE_STATE) &&
                    granted(Manifest.permission.ANSWER_PHONE_CALLS),
                hasNotif = Build.VERSION.SDK_INT < 33 || granted(Manifest.permission.POST_NOTIFICATIONS),
                lastSync = prefs.lastSyncMs,
                callers = count,
            )
        }
    }

    private fun connect(rawToken: String) {
        val parsed = PairingToken.parse(rawToken)
        if (parsed == null) {
            state = state.copy(message = "That token is not valid. Copy the whole token from Hidaya → Settings → Caller ID phones.")
            return
        }
        val prefs = Prefs.get(this)
        prefs.baseUrl = parsed.url
        prefs.apiKey = parsed.key
        prefs.token = parsed.secret
        prefs.revoked = false
        syncNow()
    }

    private fun syncNow() {
        state = state.copy(busy = true, message = null)
        lifecycleScope.launch {
            val msg = when (val r = SyncRepository.sync(this@MainActivity)) {
                is SyncResult.Ok -> "Synced ${r.callers} phone numbers."
                SyncResult.Unauthorized -> "This device was rejected (revoked or wrong token). Local data was erased."
                is SyncResult.Error -> "Sync failed: ${r.message}"
            }
            state = state.copy(busy = false, message = msg)
            refresh()
        }
    }

    private fun disconnect() {
        lifecycleScope.launch {
            SyncRepository.wipeLocalData(this@MainActivity)
            Prefs.get(this@MainActivity).clear()
            state = state.copy(message = "Disconnected. Local data erased.")
            refresh()
        }
    }

    private fun preview() {
        lifecycleScope.launch {
            val info = SyncRepository.anySample(this@MainActivity) ?: CallerInfo(
                listOf(FamilyInfo("Mulu Tesfaye", "HF/0012/26", "HF", "Dire Dawa", "normal", null)),
                System.currentTimeMillis(),
            )
            OverlayController.show(this@MainActivity, info)
        }
    }

    @Composable
    private fun Screen() {
        val s = state
        var token by remember { mutableStateOf("") }

        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp).statusBarsPadding(),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text("Hidaya Caller ID", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color(0xFF145717))

            if (!s.paired) {
                Text("Pair this phone", fontWeight = FontWeight.SemiBold)
                Text("In the Hidaya web app (administrator): Settings → Caller ID phones → Pair phone. Copy the token and paste it here.",
                    fontSize = 13.sp)
                OutlinedTextField(token, { token = it }, label = { Text("Pairing token") },
                    singleLine = true, modifier = Modifier.fillMaxWidth())
                Button(onClick = { connect(token) }, enabled = !s.busy && token.isNotBlank(),
                    modifier = Modifier.fillMaxWidth()) { Text(if (s.busy) "Connecting…" else "Connect") }
            } else {
                Card(shape = RoundedCornerShape(16.dp)) {
                    Column(Modifier.padding(16.dp)) {
                        Text("Connected", fontWeight = FontWeight.SemiBold)
                        Text("${s.callers} phone numbers stored on this phone", fontSize = 13.sp)
                        Text("Refreshes automatically every 15 minutes", fontSize = 13.sp)
                        Text(if (s.lastSync > 0) "Last synced ${relativeTime(s.lastSync)}" else "Not synced yet", fontSize = 13.sp)
                    }
                }
                if (s.revoked) Text("⚠️ This device was revoked by an administrator. Caller ID is off.", color = Color(0xFFDC2626))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(onClick = { syncNow() }, enabled = !s.busy) { Text(if (s.busy) "Syncing…" else "Sync now") }
                    OutlinedButton(onClick = { disconnect() }) { Text("Disconnect") }
                }
            }
            s.message?.let { Text(it, fontSize = 13.sp) }

            HorizontalDivider()
            Text("Setup checklist", fontWeight = FontWeight.SemiBold)

            Step("Make Hidaya the Caller ID app", s.hasRole, "Enable") {
                val rm = getSystemService(RoleManager::class.java)
                roleLauncher.launch(rm.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING))
            }
            Step("Allow display over other apps (shows the caller screen)", s.canOverlay, "Allow") {
                startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
            }
            Step("Allow phone access (Accept / Decline buttons, auto-hide)", s.hasPhonePerms, "Allow") {
                permLauncher.launch(arrayOf(Manifest.permission.READ_PHONE_STATE, Manifest.permission.ANSWER_PHONE_CALLS))
            }
            if (Build.VERSION.SDK_INT >= 33) {
                Step("Allow notifications (backup if overlay is off)", s.hasNotif, "Allow") {
                    permLauncher.launch(arrayOf(Manifest.permission.POST_NOTIFICATIONS))
                }
            }

            HorizontalDivider()
            OutlinedButton(onClick = { preview() }, modifier = Modifier.fillMaxWidth()) {
                Text("Preview caller screen")
            }
            Text("Preview needs 'display over other apps' allowed. It uses a real cached family, or sample data if nothing is synced.",
                fontSize = 12.sp)
        }
    }

    @Composable
    private fun Step(title: String, done: Boolean, button: String, onClick: () -> Unit) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            Text(if (done) "✅" else "⬜", fontSize = 20.sp)
            Spacer(Modifier.width(10.dp))
            Text(title, Modifier.weight(1f), fontSize = 14.sp)
            if (!done) OutlinedButton(onClick = onClick) { Text(button) }
        }
    }
}
