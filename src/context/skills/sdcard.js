// Storage skill — SDMMC + SPIFFS from 03-micro_sd, 04-audio, 11-mp3 examples
export const sdcardSkill = {
  id: 'sdcard',
  label: '存储 (SD卡/SPIFFS)',
  systemPrompt: `## Storage

### SD Card (SDMMC 1-bit, from 03-micro_sd / 04-audio_es7210)
\`\`\`c
// Pins: CLK=GPIO47, CMD=GPIO48, D0=GPIO21
sdmmc_host_t host = SDMMC_HOST_DEFAULT();
sdmmc_slot_config_t slot = SDMMC_SLOT_CONFIG_DEFAULT();
slot.width = 1;           // 1-bit mode (NOT 4-bit)
slot.clk = 47;
slot.cmd = 48;
slot.d0  = 21;
slot.flags |= SDMMC_SLOT_FLAG_INTERNAL_PULLUP;  // enable internal pullup

esp_vfs_fat_sdmmc_mount_config_t mount_cfg = {
    .format_if_mount_failed = true,
    .max_files              = 5,
    .allocation_unit_size   = 16 * 1024,
};
sdmmc_card_t *card;
esp_vfs_fat_sdmmc_mount("/sdcard", &host, &slot, &mount_cfg, &card);
\`\`\`

### File read/write
\`\`\`c
FILE *f = fopen("/sdcard/test.txt", "w");
fprintf(f, "hello");
fclose(f);

FILE *r = fopen("/sdcard/test.txt", "r");
char buf[64];
fgets(buf, sizeof(buf), r);
fclose(r);
\`\`\`

### SPIFFS (for MP3/model files)
\`\`\`c
bsp_spiffs_mount();  // mounts at /spiffs, partition label "storage"
FILE *f = fopen("/spiffs/music.mp3", "rb");
\`\`\`

### File iterator (for MP3 player)
\`\`\`c
file_iterator_instance_t *iter = file_iterator_new(SPIFFS_BASE);
const char *name = file_iterator_get_name_from_index(iter, 0);
char fullpath[128];
file_iterator_get_full_path_from_index(iter, 0, fullpath, sizeof(fullpath));
\`\`\`

### idf_component.yml
\`\`\`yaml
espressif/esp-file-iterator: "*"   // for MP3 file list
\`\`\`

### Pitfalls
- SD card uses 1-bit mode, NOT 4-bit (slot.width=1)
- SDMMC_SLOT_FLAG_INTERNAL_PULLUP required — external pullups optional
- SPIFFS partition label must be "storage" in partitions.csv
- SD mount point is /sdcard, SPIFFS is /spiffs (not /sd or /flash)
- format_if_mount_failed=true auto-formats blank/corrupt cards`,
}
