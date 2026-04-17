idf_component_register(SRCS "esp32_s3_szp.c"
                        INCLUDE_DIRS "."
                        REQUIRES driver esp_lcd esp_timer freertos nvs_flash esp_spiffs)
