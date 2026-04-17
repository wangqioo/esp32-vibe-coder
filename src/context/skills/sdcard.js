// Storage skill — SDMMC + SPIFFS for 立创实战派ESP32-S3
export const sdcardSkill = {
  id: 'sdcard',
  label: '存储 (SD卡/SPIFFS)',
  systemPrompt: `## Storage

### SD Card (SDMMC 1-bit)
\`\`\`c
bsp_sdcard_mount(); // mounts at /sdcard
// Pins: CLK=GPIO47, CMD=GPIO48, D0=GPIO21
FILE *f = fopen("/sdcard/test.txt", "w");
fprintf(f, "hello");
fclose(f);
\`\`\`

### SPIFFS
\`\`\`c
bsp_spiffs_mount(); // mounts at /spiffs, partition label "storage"
FILE *f = fopen("/spiffs/data.bin", "rb");
\`\`\`

### Pitfalls
- SD card mount point: /sdcard (not /sd)
- SPIFFS partition label must be "storage" in partitions.csv
- SDMMC uses 1-bit mode on this board (not 4-bit)`,
}
