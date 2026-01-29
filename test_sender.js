/**
 * test_sender.js
 * จำลองการส่งข้อมูล 2 อุปกรณ์ (test-001, test-002)
 * ส่งค่าครบทุกคอลัมน์ (Full Option)
 */

const http = require('http');

const SERVER_OPTIONS = {
  hostname: 'localhost',
  port: 3000,
  path: '/log',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
};

// --- รายชื่ออุปกรณ์ที่เปลี่ยนใหม่ ---
const DEVICES = [
  { id: 101, name: 'test-001', mac: 'AA:BB:CC:00:00:01' },
  { id: 102, name: 'test-002', mac: 'AA:BB:CC:00:00:02' }
];

// ฟังก์ชันสุ่มตัวเลขทศนิยม
function randomFloat(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(4));
}

// ฟังก์ชันสุ่มตัวเลขจำนวนเต็ม
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sendData(device) {
  // สุ่มค่าความแรง
  const mag = randomFloat(0.1, 4.0);
  
  const payload = JSON.stringify({
    // 1. ข้อมูลระบุตัวตน
    device_id: device.id,
    device_name: device.name,
    user_id: 1,
    username: "admin_tester",
    mac_address: device.mac,

    // 2. ข้อมูล Sensor หลัก
    acceleration_magnitude: mag,
    x: randomFloat(-0.5, 0.5),
    y: randomFloat(-0.5, 0.5),
    z: randomFloat(9.7, 9.9),
    
    // 3. ข้อมูล Sensor เสริม
    deviation: randomFloat(0.01, 0.1),
    pga: randomFloat(0.05, 0.5),
    rssi: randomInt(-80, -40),

    // 4. สถานะ
    level: mag > 2.5 ? 'warning' : 'normal',
    thresholdwarning: 2.0,
    thresholdcritical: 5.0,
    lat: "13.7563",
    lng: "100.5018"
    
    // ไม่ส่ง log_time (ให้ Server ลงเวลาปัจจุบันเอง)
  });

  const req = http.request(SERVER_OPTIONS, (res) => {
    res.on('data', () => {});
    res.on('end', () => {
      // แสดงผล Log ฝั่งคนส่ง
      console.log(`[>> SENT] ${device.name} | Mag: ${mag} | RSSI: ${JSON.parse(payload).rssi} | Status: ${res.statusCode}`);
    });
  });

  req.on('error', (e) => console.error(`[!! ERROR] ${e.message}`));
  req.write(payload);
  req.end();
}

console.log('--- เริ่มจำลองยิงข้อมูล: test-001 และ test-002 ---');

// ยิงสลับกันทุก 3 วินาที
setInterval(() => sendData(DEVICES[0]), 3000);
setTimeout(() => { setInterval(() => sendData(DEVICES[1]), 3000); }, 1500);
