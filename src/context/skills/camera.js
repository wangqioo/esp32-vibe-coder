// Camera skill — GC0308 DVP camera for 立创实战派ESP32-S3
export const cameraSkill = {
  id: 'camera',
  label: '摄像头 (GC0308)',
  systemPrompt: `## Camera — GC0308 DVP

### Init
\`\`\`c
bsp_i2c_init();
pca9557_init();
bsp_lcd_init();    // LCD first if displaying camera feed
bsp_camera_init(); // calls dvp_pwdn(0) internally
\`\`\`

### DVP Pins
- XCLK: GPIO5 (24MHz)
- D0-D7: {16,18,8,17,15,6,4,9}
- VSYNC: GPIO3, HREF: GPIO46, PCLK: GPIO7
- SCCB via I2C bus (pin_sccb_sda=-1, uses shared I2C)

### Camera + LCD display loop
\`\`\`c
camera_fb_t *fb = esp_camera_fb_get();
if (fb) {
    lcd_draw_bitmap(0, 0, fb->width, fb->height, fb->buf);
    esp_camera_fb_return(fb);
}
\`\`\`

### idf_component.yml
\`\`\`yaml
espressif/esp32-camera: "^2.0.10"
\`\`\`

### Pitfalls
- dvp_pwdn(0) must be called before camera init (bsp_camera_init does this)
- pca9557_init() before bsp_camera_init()
- GPIO46 has pull-down — camera HREF on GPIO46, avoid default-high
- LCD CS controlled via PCA9557 P0, not direct GPIO`,
}
