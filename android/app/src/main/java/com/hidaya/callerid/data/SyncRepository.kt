package com.hidaya.callerid.data

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.room.withTransaction
import com.hidaya.callerid.PhoneNormalizer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.TimeUnit

sealed class SyncResult {
    data class Ok(val callers: Int) : SyncResult()
    object Unauthorized : SyncResult()
    data class Error(val message: String) : SyncResult()
}

object SyncRepository {
    private val http = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

    private val JSON = "application/json".toMediaType()

    private fun JSONObject.str(key: String): String? =
        if (isNull(key)) null else optString(key).takeIf { it.isNotBlank() }

    private fun photoDir(context: Context) = File(context.filesDir, "photos").apply { mkdirs() }

    /**
     * Calls the database function caller_id_sync(p_token) through the project's REST address.
     * The public key only lets the phone call that one function; the device secret is the real credential.
     */
    suspend fun sync(context: Context): SyncResult = withContext(Dispatchers.IO) {
        val prefs = Prefs.get(context)
        val base = prefs.baseUrl
        val key = prefs.apiKey
        val token = prefs.token
        if (base.isNullOrBlank() || key.isNullOrBlank() || token.isNullOrBlank()) return@withContext SyncResult.Error("Not paired.")

        try {
            val body = JSONObject().put("p_token", token).toString().toRequestBody(JSON)
            val request = Request.Builder()
                .url("$base/rest/v1/rpc/caller_id_sync")
                .header("apikey", key)
                .header("Authorization", "Bearer $key")
                .header("Content-Type", "application/json")
                .post(body)
                .build()

            http.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext SyncResult.Error("Server error ${response.code}")
                }
                val root = JSONObject(response.body?.string().orEmpty())
                if (!root.optBoolean("ok", false)) {
                    // Revoked (or unknown secret): wipe every cached family and stop.
                    wipeLocalData(context)
                    prefs.revoked = true
                    return@withContext SyncResult.Unauthorized
                }

                val arr = root.getJSONArray("callers")
                val rows = ArrayList<CallerEntity>()
                val usedPhotos = HashSet<String>()

                for (i in 0 until arr.length()) {
                    val c = arr.getJSONObject(i)
                    val phone = PhoneNormalizer.normalize(c.optString("phone")) ?: continue
                    val photoPath = c.str("photoUrl")?.let { downloadPhoto(context, it) }
                    photoPath?.let { usedPhotos += File(it).name }
                    rows += CallerEntity(
                        phone = phone,
                        name = c.optString("name"),
                        familyCode = c.optString("familyCode"),
                        project = c.optString("project"),
                        branch = c.str("branch"),
                        state = c.optString("state", "normal"),
                        photoPath = photoPath,
                    )
                }

                val db = AppDb.get(context)
                db.withTransaction {
                    val dao = db.dao()
                    dao.clearCallers()
                    dao.insertCallers(rows)
                }
                // Remove photos of families that no longer exist.
                photoDir(context).listFiles()?.forEach { if (it.name !in usedPhotos) it.delete() }

                prefs.lastSyncMs = System.currentTimeMillis()
                prefs.revoked = false
                SyncResult.Ok(rows.map { it.phone }.distinct().size)
            }
        } catch (e: Exception) {
            SyncResult.Error(e.message ?: "Network error")
        }
    }

    /** Downloads once, shrinks to max 512px, stores as JPEG. Returns local path or null. */
    private fun downloadPhoto(context: Context, url: String): String? {
        val name = MessageDigest.getInstance("SHA-1").digest(url.toByteArray())
            .joinToString("") { "%02x".format(it) } + ".jpg"
        val file = File(photoDir(context), name)
        if (file.exists()) return file.absolutePath
        return try {
            http.newCall(Request.Builder().url(url).build()).execute().use { r ->
                if (!r.isSuccessful) return null
                val bytes = r.body?.bytes() ?: return null
                val bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return null
                val scale = 512f / maxOf(bmp.width, bmp.height)
                val out = if (scale < 1f)
                    Bitmap.createScaledBitmap(bmp, (bmp.width * scale).toInt(), (bmp.height * scale).toInt(), true)
                else bmp
                file.outputStream().use { out.compress(Bitmap.CompressFormat.JPEG, 85, it) }
                file.absolutePath
            }
        } catch (e: Exception) {
            null
        }
    }

    suspend fun wipeLocalData(context: Context) = withContext(Dispatchers.IO) {
        AppDb.get(context).clearAllTables()
        photoDir(context).listFiles()?.forEach { it.delete() }
    }

    /** Fast local lookup used at call time. No network. */
    suspend fun lookup(context: Context, normalizedPhone: String): CallerInfo? = withContext(Dispatchers.IO) {
        val rows = AppDb.get(context).dao().forPhone(normalizedPhone)
        if (rows.isEmpty()) null else toInfo(context, rows)
    }

    suspend fun anySample(context: Context): CallerInfo? = withContext(Dispatchers.IO) {
        val dao = AppDb.get(context).dao()
        val first = dao.anyCaller() ?: return@withContext null
        toInfo(context, dao.forPhone(first.phone))
    }

    private fun toInfo(context: Context, rows: List<CallerEntity>) = CallerInfo(
        families = rows.map {
            FamilyInfo(
                name = it.name,
                familyCode = it.familyCode,
                project = it.project,
                branch = it.branch,
                state = it.state,
                photo = it.photoPath?.let { p -> BitmapFactory.decodeFile(p) },
            )
        },
        lastSyncMs = Prefs.get(context).lastSyncMs,
    )
}
