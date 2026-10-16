package com.hidaya.callerid.work

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.hidaya.callerid.data.Prefs
import com.hidaya.callerid.data.SyncRepository
import com.hidaya.callerid.data.SyncResult

class SyncWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        if (!Prefs.get(applicationContext).paired) return Result.success()
        return when (SyncRepository.sync(applicationContext)) {
            is SyncResult.Ok, SyncResult.Unauthorized -> Result.success()
            is SyncResult.Error -> Result.retry()
        }
    }
}
