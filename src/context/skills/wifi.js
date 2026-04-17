// WiFi skill for 立创实战派ESP32-S3
export const wifiSkill = {
  id: 'wifi',
  label: 'WiFi',
  systemPrompt: `## WiFi

### NVS init (REQUIRED before WiFi/BLE)
\`\`\`c
esp_err_t ret = nvs_flash_init();
if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
    ESP_ERROR_CHECK(nvs_flash_erase());
    ret = nvs_flash_init();
}
ESP_ERROR_CHECK(ret);
\`\`\`

### Station connect template
\`\`\`c
esp_netif_init();
esp_event_loop_create_default();
esp_netif_create_default_wifi_sta();
wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
esp_wifi_init(&cfg);
wifi_config_t wifi_cfg = {
    .sta = { .ssid = "YOUR_SSID", .password = "YOUR_PASS" }
};
esp_wifi_set_mode(WIFI_MODE_STA);
esp_wifi_set_config(WIFI_IF_STA, &wifi_cfg);
esp_wifi_start();
esp_wifi_connect();
\`\`\`

### Pitfalls
- NVS must be initialized before WiFi init
- nvs_flash_init() before esp_netif_init()`,
}
