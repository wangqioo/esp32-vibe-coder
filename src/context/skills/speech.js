// Speech recognition skill — from 12-speech_recognition official example
export const speechSkill = {
  id: 'speech',
  label: '语音识别 (esp-sr)',
  systemPrompt: `## Speech Recognition — esp-sr (WakeNet + MultiNet)

### Full init sequence
\`\`\`c
void app_main(void) {
    bsp_i2c_init();
    pca9557_init();
    bsp_lvgl_start();
    bsp_spiffs_mount();   // model files stored in SPIFFS
    bsp_codec_init();     // audio codec (I2S locked to 16kHz/32bit)
    mp3_player_init();    // optional: background music
    app_sr_init();        // speech recognition
}
\`\`\`

### app_sr_init() pattern
\`\`\`c
void app_sr_init(void) {
    models = esp_srmodel_init("model");  // partition label "model"
    afe_handle = (esp_afe_sr_iface_t *)&ESP_AFE_SR_HANDLE;
    afe_config_t afe_config = AFE_CONFIG_DEFAULT();
    afe_config.wakenet_model_name = esp_srmodel_filter(models, ESP_WN_PREFIX, NULL);
    afe_data = afe_handle->create_from_config(&afe_config);

    task_flag = 1;
    xTaskCreatePinnedToCore(&detect_Task, "detect", 8*1024, afe_data, 5, NULL, 1);
    xTaskCreatePinnedToCore(&feed_Task,   "feed",   8*1024, afe_data, 5, NULL, 0);
}
\`\`\`

### Feed task — mic data → AFE
\`\`\`c
void feed_Task(void *arg) {
    int chunksize   = afe_handle->get_feed_chunksize(afe_data);
    int nch         = afe_handle->get_channel_num(afe_data);
    int feed_ch     = bsp_get_feed_channel();  // returns 4
    int16_t *buf = heap_caps_malloc(chunksize * sizeof(int16_t) * feed_ch,
                                     MALLOC_CAP_8BIT | MALLOC_CAP_SPIRAM);
    while (task_flag) {
        bsp_get_feed_data(false, buf, chunksize * sizeof(int16_t) * feed_ch);
        afe_handle->feed(afe_data, buf);
    }
    free(buf); vTaskDelete(NULL);
}
\`\`\`

### Detect task — wakeword + command
\`\`\`c
void detect_Task(void *arg) {
    char *mn_name = esp_srmodel_filter(models, ESP_MN_PREFIX, ESP_MN_CHINESE);
    esp_mn_iface_t *multinet = esp_mn_handle_from_name(mn_name);
    model_iface_data_t *model = multinet->create(mn_name, 6000); // 6s timeout

    esp_mn_commands_clear();
    esp_mn_commands_add(1, "bo fang yin yue");  // 播放音乐
    esp_mn_commands_add(2, "zan ting");          // 暂停
    esp_mn_commands_update();

    while (task_flag) {
        afe_fetch_result_t *res = afe_handle->fetch(afe_data);
        if (res->wakeup_state == WAKENET_CHANNEL_VERIFIED) {
            afe_handle->disable_wakenet(afe_data);
            detect_flag = 1;
        }
        if (detect_flag) {
            esp_mn_state_t state = multinet->detect(model, res->data);
            if (state == ESP_MN_STATE_DETECTED) {
                esp_mn_results_t *r = multinet->get_results(model);
                // r->command_id[0] = matched command
            }
            if (state == ESP_MN_STATE_TIMEOUT) {
                afe_handle->enable_wakenet(afe_data);
                detect_flag = 0;
            }
        }
    }
    multinet->destroy(model); vTaskDelete(NULL);
}
\`\`\`

### idf_component.yml
\`\`\`yaml
espressif/esp-sr: "~1.6.0"
espressif/esp-audio-player: "*"
espressif/esp-file-iterator: "*"
\`\`\`

### partitions.csv (model partition required)
\`\`\`
model, data, spiffs, , 4M,
\`\`\`

### Pitfalls
- I2S locked to 16kHz/32bit when using AFE; MP3 playback must use 32000Hz
- Disable _audio_player_std_clock when speech + MP3 coexist (clock conflict)
- feed_Task pinned to core 0, detect_Task pinned to core 1 (avoid contention)
- Model partition label must be "model" — matches esp_srmodel_init("model")
- Allocate feed buffer from PSRAM: MALLOC_CAP_SPIRAM (4ch * chunksize is large)
- 6000ms in multinet->create() = timeout to wait for command after wakeword`,
}
