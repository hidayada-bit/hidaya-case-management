package com.hidaya.callerid.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/** Project address, public key and the device secret live in encrypted storage. */
class Prefs private constructor(context: Context) {
    private val sp: SharedPreferences = EncryptedSharedPreferences.create(
        context.applicationContext,
        "hidaya_secure",
        MasterKey.Builder(context.applicationContext).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    /** Supabase project address, e.g. https://abcd.supabase.co */
    var baseUrl: String?
        get() = sp.getString("baseUrl", null)
        set(v) = sp.edit().putString("baseUrl", v).apply()

    /** Public (anon) key of the project — only lets the phone call the sync function. */
    var apiKey: String?
        get() = sp.getString("apiKey", null)
        set(v) = sp.edit().putString("apiKey", v).apply()

    /** The device secret from the pairing token. */
    var token: String?
        get() = sp.getString("token", null)
        set(v) = sp.edit().putString("token", v).apply()

    var lastSyncMs: Long
        get() = sp.getLong("lastSyncMs", 0L)
        set(v) = sp.edit().putLong("lastSyncMs", v).apply()

    /** True when the server said this device was revoked / the secret is unknown. */
    var revoked: Boolean
        get() = sp.getBoolean("revoked", false)
        set(v) = sp.edit().putBoolean("revoked", v).apply()

    val paired: Boolean get() = !token.isNullOrBlank() && !baseUrl.isNullOrBlank() && !apiKey.isNullOrBlank()

    fun clear() = sp.edit().clear().apply()

    companion object {
        @Volatile private var instance: Prefs? = null
        fun get(context: Context): Prefs = instance ?: synchronized(this) {
            instance ?: Prefs(context).also { instance = it }
        }
    }
}
