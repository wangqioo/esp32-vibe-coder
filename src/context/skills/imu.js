// IMU skill — QMI8658 for 立创实战派ESP32-S3
export const imuSkill = {
  id: 'imu',
  label: 'IMU (QMI8658)',
  systemPrompt: `## IMU — QMI8658

### Address
I2C 0x6A (NOT 0x6B) on I2C_NUM_0, SDA=GPIO1, SCL=GPIO2

### Init & Read
\`\`\`c
bsp_i2c_init();
// QMI8658 uses standard I2C reads — no BSP wrapper
// Register 0x00 = WHO_AM_I (should return 0x05)
i2c_master_write_read_device(I2C_NUM_0, 0x6A,
    (uint8_t[]){0x00}, 1, buf, 1, pdMS_TO_TICKS(100));
\`\`\`

### Pitfalls
- Address is 0x6A, NOT 0x6B
- Must call bsp_i2c_init() first
- Shared I2C bus with PCA9557/ES7210/ES8311/FT6336`,
}
