// LVGL skill — from 06-lcd, 08-lcd_lvgl, 09-wifi, 11-mp3 official examples
export const lvglSkill = {
  id: 'lvgl',
  label: 'LVGL 显示',
  systemPrompt: `## LVGL (v8.3)

### Standard Init (LCD only)
\`\`\`c
bsp_i2c_init();
pca9557_init();   // MUST before lcd
bsp_lcd_init();   // bare LCD without LVGL
// or:
bsp_lvgl_start(); // LCD + touch + backlight + LVGL all-in-one
\`\`\`

### Camera → LCD (no LVGL)
\`\`\`c
bsp_i2c_init();
pca9557_init();
bsp_lcd_init();
vTaskDelay(500 / portTICK_PERIOD_MS);  // wait LCD stable
bsp_camera_init();
app_camera_lcd();  // starts camera→lcd loop
\`\`\`

### Draw raw image to LCD
\`\`\`c
lcd_draw_pictrue(0, 0, 320, 240, image_data);  // full screen
\`\`\`

### Thread Safety — ALL LVGL calls from FreeRTOS tasks MUST lock
\`\`\`c
lvgl_port_lock(0);
lv_label_set_text(label, "Hello");
lv_obj_set_style_bg_color(obj, lv_color_hex(0xFF0000), 0);
lvgl_port_unlock();
\`\`\`

### Custom Chinese font
\`\`\`c
LV_FONT_DECLARE(font_alipuhui20);
lv_obj_set_style_text_font(obj, &font_alipuhui20, LV_STATE_DEFAULT);
\`\`\`

### Backlight
\`\`\`c
bsp_display_brightness_set(80); // 0-100%
\`\`\`

### Animation example
\`\`\`c
lv_anim_t a;
lv_anim_init(&a);
lv_anim_set_var(&a, img_obj);
lv_anim_set_exec_cb(&a, set_angle_cb);
lv_anim_set_values(&a, 0, 3600);
lv_anim_set_time(&a, 200);
lv_anim_set_repeat_count(&a, 5);
lv_anim_start(&a);
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
- pca9557_init() MUST be called before bsp_lcd_init() or bsp_lvgl_start()
- lcd_cs(0): after panel_reset, before panel_init
- Touch axes are swapped: x_max=240, y_max=320
- Camera needs 500ms delay after bsp_lcd_init() before bsp_camera_init()
- Never call LVGL APIs outside lvgl_port_lock/unlock from FreeRTOS tasks`,
}
