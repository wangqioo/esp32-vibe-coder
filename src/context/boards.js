import { buildSystemPrompt, ALL_SKILLS } from './index'

export const BOARDS = {
  szpi_esp32s3: {
    id: 'szpi_esp32s3',
    name: '立创实战派 ESP32-S3',
    chip: 'ESP32-S3',
    module: 'ESP32-S3-WROOM-1-N16R8',
    idfVersion: '5.4',
    description: '16MB Flash + 8MB Octal PSRAM, 320x240 ST7789 LCD, ES8311+ES7210 audio, GC0308 camera, QMI8658 IMU',
    skills: ALL_SKILLS,
    buildSystemPrompt,
  },
}

export const DEFAULT_BOARD_ID = 'szpi_esp32s3'
