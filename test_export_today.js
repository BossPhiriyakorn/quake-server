/**
 * test_export_today.js
 * สคริปต์ทดสอบ: ดึงข้อมูลของ "วันนี้" (Current Date) ออกมาเป็น CSV
 * ใช้สำหรับทดสอบดูผลลัพธ์ทันที โดยไม่ต้องรอข้ามวัน
 */

const fs = require('fs');
const { Pool } = require('pg');
const path = require('path');

// ตั้งค่า Database
const pool = new Pool({
  user: 'myuser',
  host: 'localhost',
  database: 'quakedb',
  password: '123456',
  port: 5432,
});

// ฟังก์ชันแปลง JSON -> CSV
function convertToCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const header = Object.keys(rows[0]).join(',');
  const body = rows.map(row => {
    return Object.values(row).map(val => {
      if (val === null) return '';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',');
  }).join('\n');
  return `\uFEFF${header}\n${body}`;
}

async function exportToday() {
  const client = await pool.connect();
  try {
    // 🔥 จุดที่ต่าง: ดึงวันที่ "วันนี้" (ไม่ใช่เมื่อวาน)
    // ใช้เวลาไทยในการหาวันที่ปัจจุบัน
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); 
    const targetDate = today; 

    console.log(`[TEST MODE] กำลังดึงข้อมูลของวันนี้: ${targetDate}`);

    const exportDir = path.join(__dirname, 'daily_exports');
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

    // 1. หาอุปกรณ์ที่ส่งข้อมูลมา "วันนี้"
    const devicesQuery = `
      SELECT DISTINCT device_name 
      FROM sensor_logs 
      WHERE (log_time AT TIME ZONE 'Asia/Bangkok')::date = $1
    `;
    const devicesResult = await client.query(devicesQuery, [targetDate]);
    const devices = devicesResult.rows.map(row => row.device_name);

    if (devices.length === 0) {
      console.log('[-] ยังไม่มีข้อมูลเข้ามาในวันนี้');
      return;
    }

    console.log(`[INFO] พบอุปกรณ์ ${devices.length} ตัว: ${devices.join(', ')}`);

    // 2. วนลูปสร้างไฟล์
    for (const deviceName of devices) {
        const safeName = deviceName ? deviceName.replace(/[^a-z0-9ก-๙]/gi, '_') : 'Unknown';
        
        const dataQuery = `
          SELECT 
            log_id, device_id, device_name, user_id, mac_address, rssi,
            to_char(log_time AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD HH24:MI:SS') as log_time_thai,
            acceleration_magnitude, x, y, z, level, thresholdWarning, thresholdCritical
          FROM sensor_logs 
          WHERE device_name = $1 
            AND (log_time AT TIME ZONE 'Asia/Bangkok')::date = $2
          ORDER BY log_time ASC
        `;
        
        const res = await client.query(dataQuery, [deviceName, targetDate]);

        if (res.rows.length > 0) {
            const csvData = convertToCSV(res.rows);
            // ตั้งชื่อไฟล์มีคำว่า _TEST_ ต่อท้าย จะได้ไม่สับสน
            const fileName = `${safeName}_${targetDate}_TEST.csv`;
            const filePath = path.join(exportDir, fileName);

            fs.writeFileSync(filePath, csvData);
            console.log(`[SUCCESS] บันทึกไฟล์ทดสอบ: ${fileName} (${res.rows.length} แถว)`);
        }
    }

  } catch (err) {
    console.error('[ERROR]', err);
  } finally {
    client.release();
    pool.end();
  }
}

exportToday();
