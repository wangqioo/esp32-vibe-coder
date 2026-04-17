// Audio skill — ES8311 DAC + ES7210 ADC for 立创实战派ESP32-S3
export const audioSkill = {
  id: 'audio',
  label: '音频 (ES8311/ES7210)',
  systemPrompt: `## Audio — ES8311 (DAC/Speaker) + ES7210 (ADC/4-Mic)

### Chip Addresses
- ES8311 DAC: I2C 0x18
- ES7210 ADC: I2C 0x41 (NOT 0x40 — AD0 pin is HIGH on this board)

### Init
\`\`\`c
bsp_i2c_init();
pca9557_init();
bsp_audio_init();   // I2S full-duplex 16kHz/32bit/stereo
bsp_codec_init();   // ES8311 + ES7210
bsp_codec_set_fs(16000, 32, 2);
\`\`\`

### Speaker enable (CRITICAL)
\`\`\`c
pa_en(1);  // Audio power amp via PCA9557 P1 — speaker silent without this
\`\`\`
Call pa_en(1) inside the audio PLAYING state callback, not at init.

### I2S pins
- MCLK: GPIO38, BCLK: GPIO14, WS: GPIO13
- DOUT→ES8311: GPIO45, DIN←ES7210: GPIO12
- I2S_NUM_1, MCLK_MULTIPLE=384 for ES8311 (NOT 256)

### MP3 Playback
\`\`\`c
bsp_spiffs_mount();  // or bsp_sdcard_mount()
bsp_codec_init();
// esp-audio-player handles decode + I2S write
\`\`\`
MP3 files must be 32000Hz sample rate for this board.

### 4-Mic ADC (ES7210)
\`\`\`c
int channels = esp_get_feed_channel(); // returns 4
esp_get_feed_data(raw, buf, len);      // I2S read + channel reorder for AFE
\`\`\`

### idf_component.yml
\`\`\`yaml
espressif/es8311: "^1.0.0"
espressif/es7210: "^1.0.0"
espressif/esp-audio-player: "*"
espressif/esp-file-iterator: "*"
\`\`\`

### Pitfalls
- ES7210 addr = 0x41, NOT 0x40 (silent failure if wrong)
- pa_en(1) required for speaker output
- ES8311 MCLK_MULTIPLE=384, not 256
- Speech recognition locks I2S to 16kHz/32bit; MP3 must be 32000Hz
- Disable _audio_player_std_clock when using speech recognition`,
}
