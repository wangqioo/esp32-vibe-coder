// LVGL skill — LVGL usage rules for 立创实战派ESP32-S3
export const lvglSkill = {
  id: 'lvgl',
  label: 'LVGL 显示',
  systemPrompt: `## LVGL (v8.3)

### Init
\`\`\`c
bsp_i2c_init();
pca9557_init();   // MUST before lcd
bsp_lvgl_start(); // lcd + touch + backlight all-in-one
\`\`\`

### Thread Safety — ALL LVGL calls from FreeRTOS tasks MUST lock
\`\`\`c
lvgl_port_lock(0);
lv_label_set_text(label, "Hello");
lv_obj_set_style_bg_color(obj, lv_color_hex(0xFF0000), 0);
lvgl_port_unlock();
\`\`\`

### Backlight
\`\`\`c
bsp_display_brightness_set(80); // 0-100%
\`\`\`

### sdkconfig required
\`\`\`
CONFIG_LV_COLOR_16_SWAP=y
CONFIG_LV_MEM_CUSTOM=y
CONFIG_LV_FONT_MONTSERRAT_20=y
\`\`\`

### idf_component.yml
\`\`\`yaml
lvgl/lvgl: "~8.3.0"
espressif/esp_lvgl_port: "~1.4.0"
espressif/esp_lcd_touch_ft5x06: "~1.0.6"
\`\`\`

### Pitfalls
- pca9557_init() MUST be called before bsp_lvgl_start()
- lcd_cs(0) call: after panel_reset, before panel_init
- Touch x_max=240, y_max=320 (axes swapped vs resolution)
- Never call LVGL APIs outside lvgl_port_lock/unlock from tasks`,
}
