// test_sender.js
const axios = require('axios');

// 1. ตั้งค่า URL ปลายทาง
const TARGET_URL = 'https://quakefrogdemolog.happysmart.co/log';

// 2. โครงสร้างข้อมูลทดสอบ (อ้างอิงจาก Log จริงของคุณ)
const baseData = {
    "id": 1000 + Math.floor(Math.random() * 100), // ID ทดสอบแบบสุ่ม
    "deviceId": 12,
    "deviceName": "QuakeFrog-Device-TEST", // เปลี่ยนชื่ออุปกรณ์ให้รู้ว่าเป็นการทดสอบ
    "userId": 2,
    "username": "adminEq-TEST",
    "magnitude": (Math.random() * 2.5).toFixed(2), // ค่า magnitude สุ่มระหว่าง 0.00 ถึง 2.50
    "x": 0.34,
    "y": -1.01,
    "z": 0.75,
    "macAddress": "AA:BB:CC:DD:EE:FF",
    "rssi": -65,
    "lat": "13.7563",
    "lng": "100.5018",
    "timestamp": Math.floor(Date.now() / 1000), // อัปเดตเป็นเวลาปัจจุบัน
    "isTest": true, // ตั้งเป็น true เพื่อให้รู้ว่าเป็น Log ทดสอบ
    "error": null   // สันนิษฐานว่าโดยปกติไม่มี Error
};

async function sendTestData() {
    try {
        // อัปเดต Timestamp และ Magnitude ก่อนยิงทุกครั้ง
        baseData.timestamp = Math.floor(Date.now() / 1000);
        baseData.magnitude = (Math.random() * 2.5).toFixed(2);
        
        console.log(`[Sender] กำลังยิงค่า Magnitude: ${baseData.magnitude} ไปที่: ${TARGET_URL}`);
        
        // สั่งยิง HTTP POST Request
        const response = await axios.post(TARGET_URL, baseData);

        // แสดงผลลัพธ์
        console.log(`✅ [Sender] สำเร็จ! Status: ${response.status}, Log ID: ${response.data.logId}`);
        
    } catch (error) {
        if (error.response) {
            console.error(`❌ [Sender] Error Response: Status ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
        } else {
            console.error(`❌ [Sender] Error Message: ${error.message}`);
        }
    }
}

sendTestData();
