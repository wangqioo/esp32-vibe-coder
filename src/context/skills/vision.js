// Vision skill — from 13-human_face_detection official example
export const visionSkill = {
  id: 'vision',
  label: '人脸检测 (esp-face)',
  systemPrompt: `## Human Face Detection — esp-face

### Init sequence (from 13-human_face_detection)
\`\`\`c
void app_main(void) {
    bsp_i2c_init();   // uses new I2C master API in this example
    pca9557_init();
    bsp_lcd_init();
    vTaskDelay(500 / portTICK_PERIOD_MS);
    bsp_camera_init();
    // face detection runs in camera loop
}
\`\`\`

### New I2C master API (used in 07/13 examples)
\`\`\`c
#include "driver/i2c_master.h"
i2c_master_bus_handle_t bus;
i2c_master_bus_config_t bus_cfg = {
    .clk_source = I2C_CLK_SRC_DEFAULT,
    .i2c_port   = BSP_I2C_NUM,
    .scl_io_num = BSP_I2C_SCL,
    .sda_io_num = BSP_I2C_SDA,
    .glitch_ignore_cnt = 7,
    .flags.enable_internal_pullup = 1,
};
i2c_new_master_bus(&bus_cfg, &bus);
// Per-device handle:
i2c_master_dev_handle_t dev;
i2c_device_config_t dev_cfg = {
    .dev_addr_length = I2C_ADDR_BIT_LEN_7,
    .device_address  = 0x6A,
    .scl_speed_hz    = 100000,
};
i2c_master_bus_add_device(bus, &dev_cfg, &dev);
i2c_master_transmit_receive(dev, &reg, 1, buf, len, pdMS_TO_TICKS(100));
\`\`\`

### idf_component.yml
\`\`\`yaml
espressif/esp-face: "*"
espressif/esp32-camera: "^2.0.10"
\`\`\`

### Pitfalls
- New I2C API (i2c_new_master_bus) used in camera+IMU combos; incompatible with old i2c_driver_install on same port
- Face detection is compute-heavy; allocate model buffers from PSRAM
- Camera must init after 500ms LCD stabilization delay`,
}
