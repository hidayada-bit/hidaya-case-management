package com.hidaya.callerid.overlay

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.telecom.TelecomManager
import android.telephony.PhoneStateListener
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import android.view.Gravity
import android.view.WindowManager
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.core.app.NotificationCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.ViewModelStore
import androidx.lifecycle.ViewModelStoreOwner
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.lifecycle.setViewTreeViewModelStoreOwner
import androidx.savedstate.SavedStateRegistry
import androidx.savedstate.SavedStateRegistryController
import androidx.savedstate.SavedStateRegistryOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import com.hidaya.callerid.data.CallerInfo

/** Minimal owners so a ComposeView can live in a plain WindowManager window. */
private class OverlayOwner : LifecycleOwner, SavedStateRegistryOwner, ViewModelStoreOwner {
    private val registry = LifecycleRegistry(this)
    private val savedState = SavedStateRegistryController.create(this)
    private val store = ViewModelStore()

    override val lifecycle: Lifecycle get() = registry
    override val savedStateRegistry: SavedStateRegistry get() = savedState.savedStateRegistry
    override val viewModelStore: ViewModelStore get() = store

    init {
        savedState.performAttach()
        savedState.performRestore(null)
        registry.handleLifecycleEvent(Lifecycle.Event.ON_CREATE)
        registry.handleLifecycleEvent(Lifecycle.Event.ON_START)
        registry.handleLifecycleEvent(Lifecycle.Event.ON_RESUME)
    }

    fun destroy() {
        registry.handleLifecycleEvent(Lifecycle.Event.ON_PAUSE)
        registry.handleLifecycleEvent(Lifecycle.Event.ON_STOP)
        registry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)
        store.clear()
    }
}

object OverlayController {
    private val main = Handler(Looper.getMainLooper())
    private var view: ComposeView? = null
    private var owner: OverlayOwner? = null
    private var stopWatching: (() -> Unit)? = null
    private const val CHANNEL = "hidaya_caller"

    /** Safe to call from any thread. */
    fun show(context: Context, info: CallerInfo) {
        val app = context.applicationContext
        main.post {
            hideNow(app)
            if (Settings.canDrawOverlays(app)) showOverlay(app, info) else showNotification(app, info)
        }
    }

    fun hide(context: Context) = main.post { hideNow(context.applicationContext) }

    private fun showOverlay(app: Context, info: CallerInfo) {
        val wm = app.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val canAnswer = app.checkSelfPermission(Manifest.permission.ANSWER_PHONE_CALLS) ==
            PackageManager.PERMISSION_GRANTED

        val o = OverlayOwner()
        val v = ComposeView(app).apply {
            setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnDetachedFromWindow)
            setViewTreeLifecycleOwner(o)
            setViewTreeSavedStateRegistryOwner(o)
            setViewTreeViewModelStoreOwner(o)
            setContent {
                CallerOverlayScreen(
                    info = info,
                    canAnswer = canAnswer,
                    onAccept = { answer(app); hideNow(app) },
                    onDecline = { decline(app); hideNow(app) },
                    onClose = { hideNow(app) },
                )
            }
        }
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            PixelFormat.TRANSLUCENT,
        ).apply { gravity = Gravity.TOP }

        try {
            wm.addView(v, params)
            view = v
            owner = o
            watchCall(app)
            // Safety net: never leave the screen up forever.
            main.postDelayed({ hideNow(app) }, 90_000)
        } catch (e: Exception) {
            o.destroy()
            showNotification(app, info)
        }
    }

    private fun hideNow(app: Context) {
        stopWatching?.invoke()
        stopWatching = null
        val v = view
        if (v != null) {
            try {
                (app.getSystemService(Context.WINDOW_SERVICE) as WindowManager).removeView(v)
            } catch (_: Exception) {
            }
        }
        view = null
        owner?.destroy()
        owner = null
        (app.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(1001)
    }

    /** Close our screen when the call is answered or ends. */
    private fun watchCall(app: Context) {
        if (app.checkSelfPermission(Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) return
        val tm = app.getSystemService(TelephonyManager::class.java)
        var sawRinging = false
        val onState = { state: Int ->
            when (state) {
                TelephonyManager.CALL_STATE_RINGING -> sawRinging = true
                TelephonyManager.CALL_STATE_OFFHOOK -> main.post { hideNow(app) }
                TelephonyManager.CALL_STATE_IDLE -> if (sawRinging) main.post { hideNow(app) }
            }
        }
        if (Build.VERSION.SDK_INT >= 31) {
            val cb = object : TelephonyCallback(), TelephonyCallback.CallStateListener {
                override fun onCallStateChanged(state: Int) = onState(state)
            }
            tm.registerTelephonyCallback(app.mainExecutor, cb)
            stopWatching = { tm.unregisterTelephonyCallback(cb) }
        } else {
            @Suppress("DEPRECATION")
            val l = object : PhoneStateListener() {
                @Deprecated("Deprecated in Java")
                override fun onCallStateChanged(state: Int, phoneNumber: String?) = onState(state)
            }
            @Suppress("DEPRECATION")
            tm.listen(l, PhoneStateListener.LISTEN_CALL_STATE)
            @Suppress("DEPRECATION")
            stopWatching = { tm.listen(l, PhoneStateListener.LISTEN_NONE) }
        }
    }

    private fun answer(app: Context) {
        try {
            app.getSystemService(TelecomManager::class.java).acceptRingingCall()
        } catch (_: SecurityException) {
        }
    }

    @Suppress("DEPRECATION")
    private fun decline(app: Context) {
        try {
            app.getSystemService(TelecomManager::class.java).endCall()
        } catch (_: SecurityException) {
        }
    }

    /** Used when "display over other apps" is not allowed. */
    private fun showNotification(app: Context, info: CallerInfo) {
        if (Build.VERSION.SDK_INT >= 33 &&
            app.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return
        val nm = app.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL, "Hidaya caller", NotificationManager.IMPORTANCE_HIGH)
        )
        val first = info.families.firstOrNull()
        val text = buildString {
            if (first != null) {
                if (first.familyCode.isNotBlank()) append(first.familyCode)
                val place = if (first.project == "HF" && !first.branch.isNullOrBlank()) "HF · ${first.branch}" else first.project
                if (place.isNotBlank()) append(if (isEmpty()) place else " · $place")
                when (first.state) {
                    "on_hold" -> append(" · ON HOLD")
                    "transferred" -> append(" · TRANSFERRED OUT")
                }
            }
        }
        nm.notify(
            1001,
            NotificationCompat.Builder(app, CHANNEL)
                .setSmallIcon(android.R.drawable.sym_call_incoming)
                .setContentTitle(first?.name?.ifBlank { "Hidaya family" } ?: "Hidaya family")
                .setContentText(text)
                .setStyle(NotificationCompat.BigTextStyle().bigText(text))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setTimeoutAfter(60_000)
                .build()
        )
    }
}
