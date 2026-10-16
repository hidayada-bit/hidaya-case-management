package com.hidaya.callerid.data

import android.graphics.Bitmap

/** One family that owns the number that is calling. */
data class FamilyInfo(
    val name: String,          // mother's name
    val familyCode: String,    // e.g. HF/0012/26
    val project: String,       // OVC | HF
    val branch: String?,       // HF branch
    val state: String,         // normal | on_hold | transferred
    val photo: Bitmap?,
)

/** Usually one family; more than one if the same number is registered on several families. */
data class CallerInfo(
    val families: List<FamilyInfo>,
    val lastSyncMs: Long,
)
