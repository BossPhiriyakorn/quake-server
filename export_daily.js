/**
 * export_daily.js
 * - แยกไฟล์ CSV ตามรายชื่ออุปกรณ์
 * - แก้ไข: ใช้เวลา 'received_at' (Server Time) ในการค้นหาและแสดงผล
 * เพื่อแก้ปัญหาอุปกรณ์ส่งเวลาผิด (ปี 1970)
 */

const fs = require('fs');
const { Pool } = require('pg');
const path = require('path');

// --- 1. ตั้งค่า Database ---
const pool = new Pool({
  user: 'myuser',
  host: 'localhost',
  database: 'quakedb',
  password: '123456', // <--- ตรวจสอบรหัสผ่านของท่าน
  port: 5432,
});

// --- 2. ฟังก์ชันหา "วันที่ เมื่อวาน" (Format: YYYY-MM-DD) ---
function getYesterdayDate() {
  const date = new Date();
  date.setDate(date.getDate() - 1); // ถอยหลัง 1 วัน

  // ใช้ toLocaleDateString + Asia/Bangkok เพื่อป้องกันปัญหา Timezone
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
}

// --- 3. ฟังก์ชันแปลง JSON -> CSV ---
function convertToCSV(rows) {
  if (!rows || rows.length === 0) return '';
  
  const header = Object.keys(rows[0]).join(',');
  
  const body = rows.map(row => {
    return Object.values(row).map(val => {
      if (val === null) return ''; 
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',');
  }).join('\n');
  
  // ใส่ BOM เพื่อให้ Excel อ่านภาษาไทยออก
  return `\uFEFF${header}\n${body}`;
}

async function exportData() {
  const client = await pool.connect();
  try {
    const targetDate = getYesterdayDate();
    // const targetDate = '2025-12-27'; // (ใช้บรรทัดนี้เฉพาะตอนอยากทดสอบย้อนหลัง)
    
    const exportDir = path.join(__dirname, 'daily_exports');
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);

    console.log(`[START] กำลังประมวลผลข้อมูลวันที่ (Server Time): ${targetDate}`);

    // --- STEP 1: หาอุปกรณ์ที่มีข้อมูลเข้ามา "เมื่อวาน" (เช็คจาก received_at) ---
    // 🔥 แก้ไขจุดที่ 1: เปลี่ยน log_time เป็น received_at
    const devicesQuery = `
      SELECT DISTINCT device_name 
      FROM sensor_logs 
      WHERE (received_at AT TIME ZONE 'Asia/Bangkok')::date = $1
    `;
    const devicesResult = await client.query(devicesQuery, [targetDate]);
    const devices = devicesResult.rows.map(row => row.device_name);

    if (devices.length === 0) {
      console.log(`[-] ไม่พบข้อมูลอุปกรณ์ที่ส่งเข้ามาในวันที่ (${targetDate})`);
      return;
    }

    console.log(`[INFO] พบอุปกรณ์ ${devices.length} ตัว: ${devices.join(', ')}`);

    // --- STEP 2: วนลูปดึงข้อมูลทีละตัว ---
    for (const deviceName of devices) {
        const safeName = deviceName ? deviceName.replace(/[^a-z0-9ก-๙]/gi, '_') : 'Unknown';
        
        // --- STEP 3: Query ข้อมูล (ใช้ received_at เป็นพระเอก) ---
        const dataQuery = `
          SELECT 
            log_id, 
            device_id, 
            device_name, 
            -- 🔥 แก้ไขจุดที่ 2: แสดงเวลา Server (received_at) แทนเวลาอุปกรณ์ (log_time)
            -- ตั้งชื่อคอลัมน์ว่า log_time_thai เหมือนเดิม เพื่อให้คนอ่านเข้าใจง่าย
            to_char(received_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD HH24:MI:SS') as log_time_thai,
            
            -- (เผื่ออยากดู) เอาเวลาดิบที่อุปกรณ์ส่งมาแปะไว้ท้ายๆ (ถ้าไม่ต้องการ ลบบรรทัดล่างนี้ทิ้งได้ครับ)
            to_char(log_time AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD HH24:MI:SS') as device_timestamp_original,

            rssi,
            acceleration_magnitude, 
            x, 
            y, 
            z, 
            level, 
            thresholdwarning, 
            thresholdcritical
          FROM sensor_logs 
          WHERE device_name = $1 
            -- 🔥 แก้ไขจุดที่ 3: กรองข้อมูลจาก received_at
            AND (received_at AT TIME ZONE 'Asia/Bangkok')::date = $2
          ORDER BY received_at ASC
        `;
        
        const res = await client.query(dataQuery, [deviceName, targetDate]);

        if (res.rows.length > 0) {
            const csvData = convertToCSV(res.rows);
            // ตั้งชื่อไฟล์ตามวันที่
            const fileName = `${safeName}_${targetDate}.csv`;
            const filePath = path.join(exportDir, fileName);

            fs.writeFileSync(filePath, csvData);
            console.log(`[SUCCESS] บันทึกไฟล์: ${fileName} (${res.rows.length} แถว)`);
        }
    }

  } catch (err) {
    console.error('[ERROR] เกิดข้อผิดพลาด:', err);
  } finally {
    client.release();
    pool.end();
  }
}

// สั่งทำงาน
exportData();
