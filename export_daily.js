// export_daily.js 
// แก้ไข: คำนวณ "เมื่อวาน" ตามเวลาไทย + ใส่รหัสผ่านตรงๆ กัน Cron Job พัง

const { Pool } = require('pg');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
    user: 'myuser',
    host: 'localhost',
    database: 'quakedb',
    password: 'qZ8!v@9T#kP2', // ใส่รหัสผ่านตรงๆ เพื่อความชัวร์สำหรับ Cron
    port: 5432,
};

const pool = new Pool(DB_CONFIG);
const EXPORT_DIR = path.join(__dirname, 'daily_exports'); 

async function exportYesterdayLogs() {
    console.log(`[Export] เริ่มกระบวนการส่งออก (Local Disk)...`);

    // ==================================================================
    // 📅 ส่วนคำนวณวันที่ (แก้ไขใหม่): ยึดตาม "เวลาไทย" ไม่ใช่เวลา Server
    // ==================================================================
    const now = new Date();
    // ลบเวลาไป 24 ชั่วโมง (ถอย 1 วัน)
    const yesterdayMs = now.getTime() - (24 * 60 * 60 * 1000);
    
    // แปลงเป็นสตริงวันที่ตามเวลาไทย (Format: YYYY-MM-DD)
    // การระบุ 'en-CA' จะได้ format YYYY-MM-DD อัตโนมัติ
    const dateString = new Date(yesterdayMs).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Bangkok'
    });
    // ==================================================================

    const fileName = `logs_report_${dateString}.csv`;
    const exportFilePath = path.join(EXPORT_DIR, fileName);

    console.log(`[Export] กำลังดึงข้อมูลของวันที่ (Thai Time): ${dateString}`);
    
    try {
        if (!fs.existsSync(EXPORT_DIR)) {
            fs.mkdirSync(EXPORT_DIR, { recursive: true });
        }

        // Query: เลือกเฉพาะคอลัมน์ที่ต้องการ + แปลงเวลาไทย
        const query = `
            SELECT 
                log_id,
                device_id,
                device_name,
                user_id,
                mac_address,
                rssi,
                -- แปลงเวลาเป็นไทยให้ดูง่าย
                to_char(log_time AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD HH24:MI:SS') as log_time_thai,
                acceleration_magnitude,
                x,
                y,
                z,
                level,
                thresholdWarning,
                thresholdCritical
            FROM sensor_logs 
            -- ✅ ตัดรอบวันโดยใช้เวลาไทย (สำคัญมาก)
            WHERE (log_time AT TIME ZONE 'Asia/Bangkok')::date = $1 
            ORDER BY log_time ASC
        `;

        const { rows } = await pool.query(query, [dateString]);

        if (rows.length === 0) {
            console.log(`[Export] ไม่พบข้อมูลของวันที่ ${dateString}`);
            return;
        }

        console.log(`[Export] พบ ${rows.length} รายการ กำลังแปลงเป็น CSV...`);
        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(rows);

        fs.writeFileSync(exportFilePath, csv, 'utf-8');
        console.log(`✅ [Export] บันทึกไฟล์สำเร็จบนเครื่อง: ${exportFilePath}`);

    } catch (err) {
        console.error('!!! [Export] เกิดข้อผิดพลาด:', err.message);
    } finally {
        await pool.end();
        console.log('[Export] ปิดการเชื่อมต่อ Database');
    }
}

exportYesterdayLogs();
