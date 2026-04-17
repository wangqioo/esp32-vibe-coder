// Camera skill — GC0308 DVP for 立创实战派ESP32-S3
// Enriched from 07-lcd_camera, 13-human_face_detection official examples
export const cameraSkill = {
  id: 'camera',
  label: '摄像头 (GC0308)',
  systemPrompt: `## Camera — GC0308 DVP

### Init sequence (CRITICAL order)
\`\`\`c
bsp_i2c_init();
pca9557_init();
bsp_lcd_init();
vTaskDelay(500 / portTICK_PERIOD_MS);  // LCD needs to stabilize first
bsp_camera_init();  // calls dvp_pwdn(0) internally
\`\`\`

### Camera → LCD loop
\`\`\`c
void app_camera_lcd(void) {
    camera_fb_t *fb = NULL;
    while (1) {
        fb = esp_camera_fb_get();
        if (fb) {
            lcd_draw_bitmap(0, 0, fb->width, fb->height, fb->buf);
            esp_camera_fb_return(fb);
        }
    }
}
\`\`\`

### DVP Pins
\`\`\`
XCLK: GPIO5 (24MHz)
D0-D7: {16,18,8,17,15,6,4,9}
VSYNC: GPIO3, HREF: GPIO46, PCLK: GPIO7
SCCB: shared I2C bus (pin_sccb_sda=-1)
\`\`\`

### New I2C API (used in 07/13 examples — ESP-IDF v5.x style)
\`\`\`c
// Instead of i2c_master_write_read_device, use:
i2c_master_bus_config_t bus_cfg = {
    .clk_source = I2C_CLK_SRC_DEFAULT,
    .i2c_port   = BSP_I2C_NUM,
    .scl_io_num = BSP_I2C_SCL,
    .sda_io_num = BSP_I2C_SDA,
    .glitch_ignore_cnt = 7,
    .flags.enable_internal_pullup = 1,
};
i2c_new_master_bus(&bus_cfg, &bus_handle);
// Add device:
i2c_device_config_t dev_cfg = {
    .dev_addr_length = I2C_ADDR_BIT_LEN_7,
    .device_address  = QMI8658_SENSOR_ADDR,
    .scl_speed_hz    = BSP_I2C_FREQ_HZ,
};
i2c_master_bus_add_device(bus_handle, &dev_cfg, &dev_handle);
// Read:
i2c_master_transmit_receive(dev_handle, &reg, 1, buf, len, timeout_ms);
\`\`\`

### idf_component.yml
\`\`\`yaml
espressif/esp32-camera: "^2.0.10"
\`\`\`

### Pitfalls
- 500ms delay between bsp_lcd_init() and bsp_camera_init() is required
- pca9557_init() before everything; dvp_pwdn(0) is inside bsp_camera_init()
- GPIO46 has pull-down — camera HREF on GPIO46, avoid driving it HIGH at boot
- ESP-IDF v5.x has new I2C master API (i2c_new_master_bus); old API still works but new one is preferred for camera+IMU combos`,
}
