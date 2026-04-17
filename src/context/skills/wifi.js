// WiFi skill — from 09-wifi_scan_connect, 14-handheld official examples
export const wifiSkill = {
  id: 'wifi',
  label: 'WiFi',
  systemPrompt: `## WiFi

### NVS init (REQUIRED — always first)
\`\`\`c
esp_err_t ret = nvs_flash_init();
if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
    ESP_ERROR_CHECK(nvs_flash_erase());
    ret = nvs_flash_init();
}
ESP_ERROR_CHECK(ret);
\`\`\`

### Full init sequence (with LVGL UI, from 09-wifi example)
\`\`\`c
void app_main(void) {
    // NVS first
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase()); ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);

    bsp_i2c_init();
    pca9557_init();
    bsp_lvgl_start();
    app_wifi_connect();  // WiFi scan + connect UI
}
\`\`\`

### Event group pattern for WiFi connection
\`\`\`c
#define WIFI_CONNECTED_BIT  BIT0
#define WIFI_FAIL_BIT       BIT1
static EventGroupHandle_t s_wifi_event_group;
// In event handler set bits, then wait:
xEventGroupWaitBits(s_wifi_event_group, WIFI_CONNECTED_BIT|WIFI_FAIL_BIT,
                    pdFALSE, pdFALSE, portMAX_DELAY);
\`\`\`

### Station connect
\`\`\`c
esp_netif_init();
esp_event_loop_create_default();
esp_netif_create_default_wifi_sta();
wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
esp_wifi_init(&cfg);
wifi_config_t wifi_cfg = { .sta = { .ssid="SSID", .password="PASS" } };
esp_wifi_set_mode(WIFI_MODE_STA);
esp_wifi_set_config(WIFI_IF_STA, &wifi_cfg);
esp_wifi_start();
esp_wifi_connect();
\`\`\`

### Pitfalls
- nvs_flash_init() MUST be called before esp_netif_init() or any WiFi/BLE init
- WiFi + LVGL can coexist; WiFi runs on its own task
- Max retry count recommended: 3-5 (avoid infinite reconnect loop)`,
}
