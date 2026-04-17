PYEOF
# workaround: use a temp file
IMU_SHA="8f634144d8b90ce724f9315434e5df354930cc34"

python3 - "$IMU_SHA" << 'PYEOF'
import sys, json, subprocess, base64

sha = sys.argv[1]
content = r"""// IMU skill — QMI8658 for 立创实战派ESP32-S3
// Enriched from 02-attitude official example
export const imuSkill = {
  id: 'imu',
  label: 'IMU (QMI8658)',
  systemPrompt: `## IMU — QMI8658

### I2C Address
0x6A (NOT 0x6B) on I2C_NUM_0, SDA=GPIO1, SCL=GPIO2

### Init sequence (from official example)
\`\`\`c
bsp_i2c_init();   // I2C must be first
qmi8658_init();   // then IMU init
\`\`\`

### qmi8658_init() register sequence
\`\`\`c
// WHO_AM_I must return 0x05, poll until ready
qmi8658_register_read(QMI8658_WHO_AM_I, &id, 1);
// Then configure:
qmi8658_register_write_byte(QMI8658_RESET, 0xb0);   // reset
vTaskDelay(10 / portTICK_PERIOD_MS);
qmi8658_register_write_byte(QMI8658_CTRL1, 0x40);   // auto-increment addr
qmi8658_register_write_byte(QMI8658_CTRL7, 0x03);   // enable ACC + GYR
qmi8658_register_write_byte(QMI8658_CTRL2, 0x95);   // ACC: 4g, 250Hz
qmi8658_register_write_byte(QMI8658_CTRL3, 0xd5);   // GYR: 512dps, 250Hz
\`\`\`

### Read acceleration + gyroscope
\`\`\`c
t_sQMI8658 qmi;
qmi8658_fetch_angleFromAcc(&qmi);  // computes AngleX/Y/Z from acc
// direct register read (12 bytes from QMI8658_AX_L):
qmi8658_register_read(QMI8658_AX_L, (uint8_t *)buf, 12);
// buf[0..2] = acc XYZ, buf[3..5] = gyr XYZ (int16_t)
\`\`\`

### Read status before data (avoid stale reads)
\`\`\`c
uint8_t status;
qmi8658_register_read(QMI8658_STATUS0, &status, 1);
if (status & 0x03) { /* data ready */ }
\`\`\`

### idf_component.yml
No extra component needed — uses raw I2C driver.

### Pitfalls
- Address is 0x6A NOT 0x6B; wrong address causes silent failure (no error, garbage data)
- WHO_AM_I must return 0x05; if not, chip is not powered or wrong address
- Reset (0xb0 to RESET reg) needs 10ms delay before configuring
- CTRL1=0x40 (address auto-increment) must be set before multi-byte reads
- Must call bsp_i2c_init() before qmi8658_init()`,
}
"""

encoded = base64.b64encode(content.encode()).decode()
payload = json.dumps({'message': 'feat: enrich imu.js from 02-attitude example', 'content': encoded, 'sha': sha})
result = subprocess.run(
    ['gh','api','repos/wangqioo/esp32-vibe-coder/contents/src/context/skills/imu.js','--method','PUT','--input','-'],
    input=payload, capture_output=True, text=True
)
print('imu:', 'OK' if result.returncode==0 else result.stderr[-100:])
PYEOF