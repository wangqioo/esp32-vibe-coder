// Audio skill — ES8311 DAC + ES7210 ADC for 立创实战派ESP32-S3
// Enriched from 04-audio_es7210, 05-audio_es8311, 11-mp3_player official examples
export const audioSkill = {
  id: 'audio',
  label: '音频 (ES8311/ES7210)',
  systemPrompt: `## Audio — ES8311 (DAC/Speaker) + ES7210 (ADC/4-Mic)

### Chip Addresses
- ES8311 DAC: I2C 0x18  (ES8311_ADDRRES_0)
- ES7210 ADC: I2C 0x41  (NOT 0x40 — AD0 pin is wired HIGH on this board)

### I2S Pins
- I2S_NUM_1: MCLK=GPIO38, BCLK=GPIO14, WS=GPIO13
- DOUT→ES8311: GPIO45,  DIN←ES7210: GPIO12

### ES8311 MCLK
\`\`\`c
#define EXAMPLE_MCLK_MULTIPLE   384   // NOT 256 — required for this board
#define EXAMPLE_SAMPLE_RATE     16000
#define EXAMPLE_MCLK_FREQ_HZ    (EXAMPLE_SAMPLE_RATE * EXAMPLE_MCLK_MULTIPLE)
\`\`\`

### ES8311 playback init (BSP way)
\`\`\`c
bsp_i2c_init();
pca9557_init();   // MUST before audio
bsp_audio_init(); // I2S full-duplex 16kHz/32bit/stereo
bsp_codec_init(); // ES8311 + ES7210
pa_en(1);         // enable speaker amp — call in PLAYING callback, not here
\`\`\`

### ES8311 low-level init (without BSP)
\`\`\`c
es8311_handle_t es_handle = es8311_create(BSP_I2C_NUM, ES8311_ADDRRES_0);
const es8311_clock_config_t es_clk = {
    .mclk_from_mclk_pin = true,
    .mclk_frequency     = EXAMPLE_MCLK_FREQ_HZ,  // rate * 384
    .sample_frequency   = EXAMPLE_SAMPLE_RATE,
};
es8311_init(es_handle, &es_clk, ES8311_RESOLUTION_16, ES8311_RESOLUTION_16);
es8311_sample_frequency_config(es_handle, EXAMPLE_MCLK_FREQ_HZ, EXAMPLE_SAMPLE_RATE);
es8311_voice_volume_set(es_handle, volume, NULL);
\`\`\`

### ES7210 ADC init (TDM mode, 4-mic recording)
\`\`\`c
// I2S in TDM mode
i2s_tdm_config_t tdm_cfg = {
    .clk_cfg  = { .sample_rate_hz = 48000, .mclk_multiple = I2S_MCLK_MULTIPLE_256 },
    .gpio_cfg = { .mclk=GPIO38, .bclk=GPIO14, .ws=GPIO13, .dout=-1, .din=GPIO12 },
};
// ES7210 codec config
es7210_i2c_config_t i2c_conf = { .i2c_port=I2C_NUM_0, .i2c_addr=0x41 };
es7210_new_codec(&i2c_conf, &handle);
es7210_codec_config_t codec_conf = {
    .mclk_ratio    = I2S_MCLK_MULTIPLE_256,
    .sample_rate_hz = 48000,
    .mic_gain      = ES7210_MIC_GAIN_30DB,
    .mic_bias      = ES7210_MIC_BIAS_2V87,
    .flags.tdm_enable = true,
};
es7210_config_codec(handle, &codec_conf);
\`\`\`

### MP3 player init (BSP way, from 11-mp3_player)
\`\`\`c
bsp_spiffs_mount();  // MP3 files under /spiffs
bsp_codec_init();
// player_config callbacks:
player_config.mute_fn    = _audio_player_mute_fn;
player_config.write_fn   = _audio_player_write_fn;    // calls bsp_i2s_write
player_config.clk_set_fn = _audio_player_std_clock;   // calls bsp_codec_set_fs
audio_player_new(player_config);
audio_player_callback_register(_audio_player_callback, NULL);
\`\`\`

### pa_en(1) — in callback ONLY
\`\`\`c
static void _audio_player_callback(audio_player_cb_ctx_t *ctx) {
    switch (ctx->audio_event) {
    case AUDIO_PLAYER_CALLBACK_EVENT_PLAYING:
        pa_en(1);  // open amp when playing starts
        break;
    case AUDIO_PLAYER_CALLBACK_EVENT_PAUSE:
        pa_en(0);  // close amp on pause
        break;
    }
}
\`\`\`

### Volume control
\`\`\`c
bsp_codec_volume_set(volume, NULL);  // 0-100
bsp_codec_mute_set(true/false);
\`\`\`

### idf_component.yml
\`\`\`yaml
espressif/es8311: "^1.0.0"
espressif/es7210: "^1.0.0"
espressif/esp-audio-player: "*"
espressif/esp-file-iterator: "*"
\`\`\`

### Pitfalls
- ES7210 I2C addr = 0x41 NOT 0x40 (AD0 wired HIGH); wrong addr = silent failure
- pa_en(1) MUST be called in the PLAYING callback, not at init — otherwise no sound
- ES8311 MCLK_MULTIPLE = 384, not 256
- Speech recognition locks I2S to 16kHz/32bit; MP3 must be encoded at 32000Hz
- Disable _audio_player_std_clock callback when using speech recognition (clock conflict)
- pca9557_init() must be called before any audio init`,
}
