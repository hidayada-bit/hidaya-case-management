package com.hidaya.callerid.data

import android.util.Base64
import org.json.JSONObject

/**
 * The web app (Settings → Caller ID phones → Pair phone) shows a token like  HDA1.<base64url JSON>.
 * The JSON holds { u: project address, k: public key, t: one-time device secret }, so the person
 * only has to enter ONE thing.
 */
object PairingToken {
    data class Parsed(val url: String, val key: String, val secret: String)

    fun parse(raw: String): Parsed? {
        val t = raw.trim().replace("\\s".toRegex(), "")
        if (!t.startsWith("HDA1.")) return null
        return try {
            val bytes = Base64.decode(t.removePrefix("HDA1."), Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
            val o = JSONObject(String(bytes, Charsets.UTF_8))
            val url = o.getString("u").trim().trimEnd('/')
            val key = o.getString("k").trim()
            val secret = o.getString("t").trim()
            if (url.isBlank() || key.isBlank() || secret.isBlank()) null else Parsed(url, key, secret)
        } catch (e: Exception) {
            null
        }
    }
}
