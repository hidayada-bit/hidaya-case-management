package com.hidaya.callerid.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Index
import androidx.room.Insert
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase

/** One row per (phone number, family). */
@Entity(tableName = "callers", indices = [Index("phone")])
data class CallerEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val phone: String,        // normalized +251...
    val name: String,
    val familyCode: String,
    val project: String,
    val branch: String?,
    val state: String,
    val photoPath: String?,
)

@Dao
interface CallerDao {
    @Query("SELECT * FROM callers WHERE phone = :phone")
    suspend fun forPhone(phone: String): List<CallerEntity>

    @Query("SELECT * FROM callers LIMIT 1")
    suspend fun anyCaller(): CallerEntity?

    @Query("SELECT COUNT(DISTINCT phone) FROM callers")
    suspend fun count(): Int

    @Query("DELETE FROM callers")
    suspend fun clearCallers()

    @Insert
    suspend fun insertCallers(list: List<CallerEntity>)
}

@Database(entities = [CallerEntity::class], version = 1, exportSchema = false)
abstract class AppDb : RoomDatabase() {
    abstract fun dao(): CallerDao

    companion object {
        @Volatile private var instance: AppDb? = null
        fun get(context: Context): AppDb = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(context.applicationContext, AppDb::class.java, "callerid.db")
                .build().also { instance = it }
        }
    }
}
