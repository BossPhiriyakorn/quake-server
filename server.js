// server.js: API Receiver (Fix: No device_payload_id)

const express = require('express');
const { Pool } = require('pg');

const DB_CONFIG = {
    user: process.env.DB_USER || 'myuser',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'quakedb',
    password: process.env.DB_PASSWORD,
    port: 5432,
};

const app = express();
const PORT = 3000;

app.use(express.json());
const pool = new Pool(DB_CONFIG);

app.post('/log', async (req, res) => {
    const data = req.body;

    if (!data || Object.keys(data).length === 0) {
        console.warn(`[WARN] ได้รับ Request แต่ไม่มีข้อมูล JSON`);
        return res.status(400).send({ message: 'Bad Request: No Data' });
    }

    console.log(`[LOG] ได้รับข้อมูลจาก:`, data.deviceName || data.deviceId);

    if (!data.deviceId || data.timestamp === undefined) {
        return res.status(400).send({ message: 'Bad Request: Missing fields' });
    }

    // SQL INSERT: มี 18 คอลัมน์ (ลบ device_payload_id ออกแล้ว)
    const insertQuery = `
        INSERT INTO sensor_logs (
            device_id, device_name, user_id, username,
            mac_address, rssi, lat, lng, log_time,
            acceleration_magnitude, deviation, pga, x, y, z,
            level, thresholdWarning, thresholdCritical
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, to_timestamp($9),
            $10, $11, $12, $13, $14, $15, $16, $17, $18
        ) RETURNING log_id;
    `;

    // Values: มี 18 ค่า ให้ตรงกับด้านบน
    const values = [
        data.deviceId,          // $1
        data.deviceName || null,  // $2
        data.userId || null,      // $3
        data.username || null,    // $4
        data.macAddress || null,  // $5
        data.rssi || null,        // $6
        data.lat || null,         // $7
        data.lng || null,         // $8
        data.timestamp,           // $9
        data.magnitude || null,   // $10
        data.deviation || null,   // $11
        data.pga || null,         // $12
        data.x || null,           // $13
        data.y || null,           // $14
        data.z || null,           // $15
        data.level || null,       // $16
        data.thresholdWarning || null, // $17
        data.thresholdCritical || null // $18
    ];

    try {
        const result = await pool.query(insertQuery, values);
        res.status(201).send({ message: 'Log received', logId: result.rows[0].log_id });
    } catch (err) {
        console.error('!!! Database Error:', err.message);
        res.status(500).send({ message: 'Internal Server Error' });
    }
});

app.get('/', (req, res) => res.send('Quake Receiver Running!'));

// เอา IP '127.0.0.1' ออกเพื่อให้รับ connection จากข้างนอกได้ชัวร์ๆ
app.listen(PORT, () => {
    console.log(`[OK] Server listening on port ${PORT}`);
});
