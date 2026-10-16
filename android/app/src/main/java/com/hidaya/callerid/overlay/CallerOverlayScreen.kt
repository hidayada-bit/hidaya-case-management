package com.hidaya.callerid.overlay

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.hidaya.callerid.data.CallerInfo
import com.hidaya.callerid.data.FamilyInfo
import com.hidaya.callerid.ui.relativeTime

private val Gold = Color(0xFFF5A800)   // HDA gold
private val Accept = Color(0xFF2ECC71)
private val Decline = Color(0xFFFF4D5E)
private val HoldOrange = Color(0xFFF0A060) // HDA night-mode orange
private val TransferRed = Color(0xFFEF8080) // HDA night-mode red

@Composable
fun CallerOverlayScreen(
    info: CallerInfo,
    canAnswer: Boolean,
    onAccept: () -> Unit,
    onDecline: () -> Unit,
    onClose: () -> Unit,
) {
    var selected by remember { mutableIntStateOf(0) }
    val multi = info.families.size > 1
    val family = info.families.getOrNull(selected)

    Box(
        Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(Color(0xFF0D3B0F), Color(0xFF145717), Color(0xFF0D3B0F))))
    ) {
        Column(
            Modifier.fillMaxSize().padding(horizontal = 24.dp).padding(top = 56.dp, bottom = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text("HIDAYA · HDA", color = Gold, fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold, letterSpacing = 3.sp)
            Spacer(Modifier.height(4.dp))
            Text("INCOMING CALL", color = Color.White.copy(alpha = .55f), fontSize = 12.sp, letterSpacing = 2.sp)

            Column(
                Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Spacer(Modifier.height(24.dp))

                if (multi) {
                    Text("This number is on ${info.families.size} families", color = Color.White.copy(alpha = .7f), fontSize = 14.sp)
                    Spacer(Modifier.height(12.dp))
                    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        info.families.forEachIndexed { i, f ->
                            val on = i == selected
                            Row(
                                Modifier.clip(RoundedCornerShape(50))
                                    .background(if (on) Color.White.copy(alpha = .22f) else Color.White.copy(alpha = .08f))
                                    .border(1.dp, Color.White.copy(alpha = if (on) .5f else .15f), RoundedCornerShape(50))
                                    .clickable { selected = i }
                                    .padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Avatar(f, 28)
                                Spacer(Modifier.width(8.dp))
                                Text(f.name.ifBlank { "Family" }.substringBefore(' '), color = Color.White, fontSize = 14.sp)
                            }
                        }
                    }
                    Spacer(Modifier.height(20.dp))
                }

                if (family != null) {
                    Avatar(family, if (multi) 104 else 140)
                    Spacer(Modifier.height(16.dp))
                    Text(family.name.ifBlank { "Hidaya family" }, color = Color.White, fontSize = if (multi) 26.sp else 32.sp,
                        fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                    Text("Mother / guardian", color = Color.White.copy(alpha = .55f), fontSize = 13.sp)

                    StateTag(family.state)

                    Spacer(Modifier.height(20.dp))
                    Details(family)
                } else {
                    Spacer(Modifier.height(40.dp))
                    Text("Hidaya family", color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Bold)
                }
            }

            Text(
                if (info.lastSyncMs > 0) "Last synced ${relativeTime(info.lastSyncMs)}" else "Not synced yet",
                color = Color.White.copy(alpha = .4f), fontSize = 12.sp,
            )
            Spacer(Modifier.height(16.dp))
            if (canAnswer) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                    RoundAction("✕", "Decline", Decline, onDecline)
                    RoundAction("✓", "Accept", Accept, onAccept)
                }
                Spacer(Modifier.height(12.dp))
                Text("Hide", color = Color.White.copy(alpha = .6f), fontSize = 14.sp,
                    modifier = Modifier.clickable { onClose() }.padding(8.dp))
            } else {
                Text("Close", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.clip(RoundedCornerShape(50)).background(Color.White.copy(alpha = .18f))
                        .clickable { onClose() }.padding(horizontal = 40.dp, vertical = 14.dp))
            }
        }
    }
}

/** Clear warning when the family is on hold or transferred out. Nothing is shown for a normal family. */
@Composable
private fun StateTag(state: String) {
    val (text, color) = when (state) {
        "on_hold" -> "⏸  ON HOLD — payment paused" to HoldOrange
        "transferred" -> "⛔  TRANSFERRED OUT — no longer in the program" to TransferRed
        else -> return
    }
    Spacer(Modifier.height(14.dp))
    Text(
        text, color = color, fontSize = 14.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center,
        modifier = Modifier.clip(RoundedCornerShape(50))
            .background(color.copy(alpha = .18f))
            .border(1.5.dp, color.copy(alpha = .8f), RoundedCornerShape(50))
            .padding(horizontal = 18.dp, vertical = 9.dp),
    )
}

@Composable
private fun Details(f: FamilyInfo) {
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        if (f.familyCode.isNotBlank()) GlassRow("🪪", "Family ID", f.familyCode, Color.White)
        val place = when {
            f.project == "HF" && !f.branch.isNullOrBlank() -> "HF · ${f.branch}"
            f.project.isNotBlank() -> f.project
            else -> null
        }
        place?.let { GlassRow("📍", "Project / branch", it, Color.White) }
    }
}

@Composable
private fun GlassRow(icon: String, label: String, value: String, accent: Color) {
    Row(
        Modifier.fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(Color.White.copy(alpha = .08f))
            .border(1.dp, accent.copy(alpha = .28f), RoundedCornerShape(20.dp))
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(icon, fontSize = 22.sp)
        Spacer(Modifier.width(12.dp))
        Column {
            Text(label.uppercase(), color = Color.White.copy(alpha = .5f), fontSize = 11.sp, letterSpacing = 1.5.sp)
            Text(value, color = accent, fontSize = 17.sp, fontWeight = FontWeight.Medium)
        }
    }
}

@Composable
private fun Avatar(f: FamilyInfo, size: Int) {
    val mod = Modifier.size(size.dp).clip(CircleShape).border(2.dp, Color.White.copy(alpha = .35f), CircleShape)
    if (f.photo != null) {
        Image(f.photo.asImageBitmap(), contentDescription = null, contentScale = ContentScale.Crop, modifier = mod)
    } else {
        Box(
            mod.background(Brush.linearGradient(listOf(Color(0xFF1E7D22), Gold))),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                f.name.trim().firstOrNull()?.uppercase() ?: "H",
                color = Color.White, fontSize = (size / 2.4).sp, fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
private fun RoundAction(symbol: String, label: String, color: Color, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            Modifier.size(76.dp).clip(CircleShape).background(color).clickable { onClick() },
            contentAlignment = Alignment.Center,
        ) { Text(symbol, color = Color.White, fontSize = 30.sp, fontWeight = FontWeight.Bold) }
        Spacer(Modifier.height(6.dp))
        Text(label, color = Color.White.copy(alpha = .8f), fontSize = 13.sp)
    }
}
