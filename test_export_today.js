// test_export_today.js 
// (เวอร์ชันทดสอบ: ดึงข้อมูลวันนี้ + เลือกเฉพาะคอลัมน์ที่ต้องการ)

const { Pool } = require('pg');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');

// การตั้งค่า Database
const DB_CONFIG = {
    user: process.env.DB_USER || 'myuser',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'quakedb',
    password: process.env.DB_PASSWORD,
    port: 5432,
};

const pool = new Pool(DB_CONFIG);
const EXPORT_DIR = path.join(__dirname, 'daily_exports'); 

async function exportTodayLogs() {
    console.log(`[Test Export] เริ่มกระบวนการส่งออก (Local Disk)...`);

    // ==========================================
    // 📅 ส่วนกำหนดวันที่: ดึงข้อมูลของ "วันนี้" (Today)
    // ==========================================
    const today = new Date(); 
    const dateString = today.toISOString().split('T')[0];
    // ==========================================

    const fileName = `logs_report_${dateString}.csv`;
    const exportFilePath = path.join(EXPORT_DIR, fileName);

    console.log(`[Test Export] กำลังดึงข้อมูลของวันที่: ${dateString}`);
    
    try {
        if (!fs.existsSync(EXPORT_DIR)) {
            fs.mkdirSync(EXPORT_DIR, { recursive: true });
        }

        // ============================================================
        // 🛠️ ส่วน Query: เลือกเฉพาะคอลัมน์ที่ต้องการ + แปลงเวลาไทย
        // ============================================================
        const query = `
            SELECT 
                log_id,
                device_id,
                device_name,
                user_id,
                mac_address,
                rssi,
                -- แปลงเวลาเป็นไทย
                to_char(log_time AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD HH24:MI:SS') as log_time_thai,
                acceleration_magnitude,
                x,
                y,
                z,
                level,
                thresholdWarning,
                thresholdCritical
            FROM sensor_logs 
            WHERE log_time::date = $1 
            ORDER BY log_time ASC
        `;

        const { rows } = await pool.query(query, [dateString]);

        if (rows.length === 0) {
            console.log(`[Test Export] ไม่พบข้อมูลของวันที่ ${dateString}`);
            return;
        }

        console.log(`[Test Export] พบ ${rows.length} รายการ กำลังแปลงเป็น CSV...`);
        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(rows);

        fs.writeFileSync(exportFilePath, csv, 'utf-8');
        console.log(`✅ [Test Export] บันทึกไฟล์สำเร็จบนเครื่อง: ${exportFilePath}`);

    } catch (err) {
        console.error('!!! [Test Export] เกิดข้อผิดพลาด:', err.message);
    } finally {
        await pool.end();
        console.log('[Test Export] ปิดการเชื่อมต่อ Database');
    }
}

exportTodayLogs();
