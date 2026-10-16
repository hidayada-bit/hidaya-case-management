package com.hidaya.callerid.service

import android.telecom.Call
import android.telecom.CallScreeningService
import com.hidaya.callerid.PhoneNormalizer
import com.hidaya.callerid.data.Prefs
import com.hidaya.callerid.data.SyncRepository
import com.hidaya.callerid.overlay.OverlayController
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Android calls this for incoming calls once Hidaya holds the
 * "Caller ID & spam app" role. We NEVER block or silence a call: we
 * answer Android immediately with "allow", then look the number up in
 * the local database and show the caller screen.
 */
class HidayaCallScreeningService : CallScreeningService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onScreenCall(callDetails: Call.Details) {
        val number = callDetails.handle?.schemeSpecificPart
        val incoming = callDetails.callDirection == Call.Details.DIRECTION_INCOMING

        // 1. Respond right away so we never delay the call.
        respondToCall(callDetails, CallResponse.Builder().build())

        if (!incoming) return
        val appContext = applicationContext
        if (!Prefs.get(appContext).paired || Prefs.get(appContext).revoked) return
        val normalized = PhoneNormalizer.normalize(number) ?: return // hidden/unknown/invalid

        // 2. Local lookup only (no network). Unknown number -> show nothing.
        scope.launch {
            val info = SyncRepository.lookup(appContext, normalized) ?: return@launch
            OverlayController.show(appContext, info)
        }
    }
}
