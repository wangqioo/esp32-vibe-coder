# ESP32 Cloud Compiler Service
# Base: official ESP-IDF v5.4 image (~3GB, includes xtensa toolchain)
FROM espressif/idf:v5.4

# Install Python deps for the API server
RUN pip install flask gunicorn --break-system-packages

WORKDIR /compiler

# Copy project template
COPY template/ ./template/

# Vendor the BSP component directly into the template so builds never need
# to fetch from GitHub at runtime (China servers often can't reach GitHub).
RUN git clone --depth 1 https://github.com/Lzw655/esp32_s3_szp.git \
        /compiler/template/components/esp32_s3_szp 2>&1 | tail -5 && \
    echo "BSP component vendored OK" || echo "WARNING: BSP clone failed — builds may not work"

# Pre-warm the cmake/component cache so first user build is faster.
# Uses the now-local BSP so no network needed.
RUN cd /tmp && \
    cp -r /compiler/template warmup && \
    . /opt/esp/idf/export.sh && \
    idf.py -C warmup -B warmup/build reconfigure 2>&1 | tail -20 || true && \
    rm -rf /tmp/warmup

# Copy API server
COPY server.py .

EXPOSE 8765

ENTRYPOINT ["/bin/bash", "-c", \
    "source /opt/esp/idf/export.sh && gunicorn -w 2 -b 0.0.0.0:8760 --timeout 180 server:app"]
