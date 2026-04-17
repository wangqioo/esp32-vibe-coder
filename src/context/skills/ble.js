// BLE skill — from 10-ble_hid_device official example
export const bleSkill = {
  id: 'ble',
  label: 'BLE (Classic BT / HID)',
  systemPrompt: `## BLE — Bluedroid stack (HID device example)

### Init sequence (from 10-ble_hid_device)
\`\`\`c
bsp_i2c_init();
pca9557_init();
bsp_lvgl_start();
app_hid_ctrl();  // starts BLE HID
\`\`\`

### BLE HID init (Bluedroid)
\`\`\`c
// NVS first
nvs_flash_init();
// Init Bluedroid
esp_bt_controller_config_t bt_cfg = BT_CONTROLLER_INIT_CONFIG_DEFAULT();
esp_bt_controller_init(&bt_cfg);
esp_bt_controller_enable(ESP_BT_MODE_BLE);
esp_bluedroid_init();
esp_bluedroid_enable();
// Register callbacks
esp_hidd_profile_init();
esp_ble_gap_register_callback(gap_event_handler);
esp_hidd_register_callbacks(hidd_event_callback);
\`\`\`

### HID reports available
- Mouse (report 1)
- Keyboard + LED (report 2)
- Consumer devices (report 3)
- Vendor (report 4, disabled on Win10)

### NimBLE alternative (lighter stack)
\`\`\`c
// sdkconfig: CONFIG_BT_NIMBLE_ENABLED=y
esp_nimble_hci_init();
nimble_port_init();
ble_hs_cfg.sync_cb = ble_app_on_sync;
nimble_port_freertos_init(ble_host_task);
\`\`\`

### sdkconfig required
\`\`\`
CONFIG_BT_ENABLED=y
CONFIG_BT_BLUEDROID_ENABLED=y   // for Bluedroid/HID
// OR:
CONFIG_BT_NIMBLE_ENABLED=y      // for NimBLE (lighter)
\`\`\`

### Pitfalls
- ESP32-S3 is BLE only (no Classic BT audio)
- nvs_flash_init() before any BT stack init
- Bluedroid and NimBLE cannot be enabled simultaneously
- iPhone BLE encryption: ignore GATT_INSUF_ENCRYPTION on descriptor write
- WiFi + BLE coexistence needs CONFIG_ESP_COEX_ENABLED=y`,
}
