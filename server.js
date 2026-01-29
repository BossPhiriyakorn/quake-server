const express = require('express');
const { Pool } = require('pg');

// 1. ตั้งค่า Database (อิงจากโค้ดเดิมของคุณ + แก้รหัสผ่าน)
const DB_CONFIG = {
  user: process.env.DB_USER || 'myuser',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'quakedb',
  password: '123456', // <--- แก้รหัสผ่านเรียบร้อย
  port: 5432,
};

const app = express();
const PORT = 3000;

// Middleware อ่าน JSON
app.use(express.json());

// สร้าง Connection Pool
const pool = new Pool(DB_CONFIG);

// API รับค่า
app.post('/log', async (req, res) => {
  const data = req.body;

  // --- 1. Validation เบื้องต้น: มีข้อมูลส่งมาไหม? ---
  if (!data || Object.keys(data).length === 0) {
    console.warn('[WARN] ได้รับ Request แต่ไม่มีข้อมูล JSON');
    return res.status(400).send({ message: 'Bad Request: No Data' });
  }

  // --- 2. Normalization: แปลงค่าตัวแปรให้รองรับทั้ง "แบบเก่า" และ "แบบใหม่" ---
  // (เพื่อให้รับได้ทั้ง deviceId และ device_id)
  const deviceId = data.device_id || data.deviceId;
  const devName = data.device_name || data.deviceName || 'Unknown';
  const level = (data.level || 'NORMAL').toUpperCase();
  const mag = data.acceleration_magnitude || data.magnitude || 0; // รับทั้งชื่อยาวและสั้น
  const x = data.x || 0;
  const y = data.y || 0;
  const z = data.z || 0;
  
  // จัดการเรื่องเวลา: ถ้าส่ง timestamp มาให้ใช้ ถ้าไม่ส่งให้ใช้เวลาปัจจุบัน
  const logDate = data.log_time || data.timestamp ? new Date(data.log_time || data.timestamp) : new Date();

  // --- 3. แสดง Log แบบ Dashboard (Log สวย + เวลาไทย) ---
  try {
    // ดึงเวลาปัจจุบัน (Thai Timezone) เพื่อแสดงใน Log
    const timeNow = new Date().toLocaleTimeString('th-TH', {
      hour12: false,
      timeZone: 'Asia/Bangkok',
    });

    // Format: "ชื่อ | [LEVEL] Magnitude: ค่า | XYZ | Time: เวลา"
    const logMsg = `${devName} | [${level}] Magnitude: ${mag} | X:${x} Y:${y} Z:${z} | Time: ${timeNow}`;
    console.log(logMsg);

  } catch (err) {
    // กรณีกันเหนียว
    console.log('[LOG] Raw Data:', JSON.stringify(data));
  }

  // --- 4. ตรวจสอบข้อมูลสำคัญ (Critical Check) ---
  if (!deviceId) {
     return res.status(400).send({ message: 'Bad Request: Missing device_id' });
  }

  // --- 5. บันทึกลง Database ---
  try {
    const insertQuery = `
      INSERT INTO sensor_logs (
        device_id, device_name, user_id, username,
        mac_address, rssi, lat, lng, log_time,
        acceleration_magnitude, deviation, pga, x, y, z,
        level, thresholdWarning, thresholdCritical
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15,
        $16, $17, $18
      ) RETURNING log_id
    `;

    // เตรียมค่า (Values) - รองรับชื่อตัวแปรจากโค้ดเดิมของคุณ
    const values = [
      deviceId,                            // $1
      devName,                             // $2
      data.user_id || data.userId,         // $3
      data.username,                       // $4
      data.mac_address || data.macAddress, // $5
      data.rssi,                           // $6
      data.lat,                            // $7
      data.lng,                            // $8
      logDate,                             // $9 (ใช้วันที่ที่เตรียมไว้ข้างบน)
      mag,                                 // $10
      data.deviation,                      // $11
      data.pga,                            // $12
      x,                                   // $13
      y,                                   // $14
      z,                                   // $15
      data.level,                          // $16
      data.thresholdWarning || data.thresholdwarning, // $17 (รองรับทั้ง W ตัวเล็ก/ใหญ่)
      data.thresholdCritical || data.thresholdcritical // $18 (รองรับทั้ง C ตัวเล็ก/ใหญ่)
    ];

    // รันคำสั่ง SQL
    const result = await pool.query(insertQuery, values);
    
    // ตอบกลับสำเร็จ (201 Created)
    res.status(201).send({ 
      message: 'Log received', 
      logId: result.rows[0].log_id 
    });

  } catch (err) {
    console.error('!!! Database Error:', err.message);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

// เริ่มต้น Server
app.listen(PORT, () => {
  console.log(`[OK] Server listening on port ${PORT}`);
  console.log('Quake Receiver is Ready!');
});
