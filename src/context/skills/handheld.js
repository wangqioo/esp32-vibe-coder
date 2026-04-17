// Handheld skill — from 14-handheld comprehensive example
export const handheldSkill = {
  id: 'handheld',
  label: '综合手持设备',
  systemPrompt: `## 综合手持设备 — 14-handheld 例程模式

### Full init sequence (all peripherals)
\`\`\`c
void app_main(void) {
    // 1. NVS (required for WiFi/BLE)
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase()); ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);

    // 2. Hardware init (fixed order)
    bsp_i2c_init();
    pca9557_init();
    bsp_lvgl_start();
    bsp_spiffs_mount();
    bsp_codec_init();

    // 3. Boot UI + startup sound
    lv_gui_start();  // show logo with rotation animation

    // 4. FreeRTOS tasks (pinned to specific cores)
    xTaskCreatePinnedToCore(power_music_task, "power_music", 4*1024, NULL, 5, NULL, 1);
    xTaskCreatePinnedToCore(main_page_task,   "main_page",   4*1024, NULL, 5, NULL, 0);
}
\`\`\`

### EventGroup for task synchronization
\`\`\`c
EventGroupHandle_t my_event_group = xEventGroupCreate();
// Signal from music task when done:
xEventGroupSetBits(my_event_group, START_MUSIC_COMPLETED);
// Wait in UI task:
xEventGroupWaitBits(my_event_group, START_MUSIC_COMPLETED,
                    pdFALSE, pdFALSE, portMAX_DELAY);
\`\`\`

### Memory monitoring (useful for debug)
\`\`\`c
size_t free_dram  = heap_caps_get_free_size(MALLOC_CAP_INTERNAL);
size_t free_psram = heap_caps_get_free_size(MALLOC_CAP_SPIRAM);
size_t largest    = heap_caps_get_largest_free_block(MALLOC_CAP_SPIRAM);
\`\`\`

### Boot animation pattern
\`\`\`c
lvgl_port_lock(0);
LV_IMG_DECLARE(image_lckfb_logo);
lv_obj_t *logo = lv_img_create(lv_scr_act());
lv_img_set_src(logo, &image_lckfb_logo);
lv_obj_align(logo, LV_ALIGN_CENTER, 0, 0);
lv_img_set_pivot(logo, 60, 60);
lv_anim_t a; lv_anim_init(&a);
lv_anim_set_var(&a, logo);
lv_anim_set_exec_cb(&a, set_angle);
lv_anim_set_values(&a, 0, 3600);
lv_anim_set_time(&a, 200);
lv_anim_set_repeat_count(&a, 5);
lv_anim_start(&a);
lvgl_port_unlock();
\`\`\`

### Pitfalls
- NVS init before any WiFi/BLE even if not used immediately
- Tasks using audio: pin to core 1; UI tasks: pin to core 0
- lv_gui_start() must be inside lvgl_port_lock/unlock
- Allocate large buffers (camera frames, audio) from PSRAM: MALLOC_CAP_SPIRAM`,
}
