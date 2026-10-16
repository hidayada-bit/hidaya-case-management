package com.hidaya.callerid

/**
 * Same rules as the web app's src/lib/phone.ts. Everything resolves to
 * "+251" + 9 digits starting with 7 or 9, or null (never guess).
 */
object PhoneNormalizer {
    private val subscriber = Regex("^[79]\\d{8}$")

    fun normalize(raw: String?): String? {
        if (raw.isNullOrBlank()) return null
        val hasPlus = raw.trim().startsWith("+")
        var digits = raw.filter { it.isDigit() }
        if (!hasPlus && digits.startsWith("00")) digits = digits.drop(2)

        val sub = when {
            digits.startsWith("251") && digits.length == 12 -> digits.drop(3)
            digits.startsWith("0") && digits.length == 10 -> digits.drop(1)
            digits.length == 9 -> digits
            else -> return null
        }
        return if (subscriber.matches(sub)) "+251$sub" else null
    }
}
