// BLE skill — NimBLE for 立创实战派ESP32-S3
export const bleSkill = {
  id: 'ble',
  label: 'BLE (NimBLE)',
  systemPrompt: `## BLE — NimBLE (ESP-IDF built-in)

### NVS init (REQUIRED)
\`\`\`c
nvs_flash_init(); // before nimble_port_init
\`\`\`

### Init template
\`\`\`c
esp_nimble_hci_init();
nimble_port_init();
ble_hs_cfg.sync_cb = ble_app_on_sync;
nimble_port_freertos_init(ble_host_task);
\`\`\`

### sdkconfig required
\`\`\`
CONFIG_BT_ENABLED=y
CONFIG_BT_NIMBLE_ENABLED=y
\`\`\`

### Pitfalls
- NVS must init before nimble_port_init
- Cannot use classic BT (ESP32-S3 is BLE only)
- BLE and WiFi can coexist but need CONFIG_ESP_COEX_ENABLED=y`,
}
