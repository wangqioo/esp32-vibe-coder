# ESP32 Cloud Compiler Service
# Base: official ESP-IDF v5.4 image (~3GB, includes xtensa toolchain)
FROM espressif/idf:v5.4

# Install Python deps for the API server
RUN pip install flask gunicorn --break-system-packages

WORKDIR /compiler

# Copy project template
COPY template/ ./template/

# Pre-fetch BSP component to warm the component cache
# (avoids downloading on every build request)
RUN cd /tmp && \
    cp -r /compiler/template warmup && \
    . /opt/esp/idf/export.sh && \
    idf.py -C warmup -B warmup/build reconfigure || true && \
    rm -rf /tmp/warmup

# Copy API server
COPY server.py .

EXPOSE 8765

# Use gunicorn with 2 workers (compile is CPU-bound, keep it small)
CMD ["/opt/esp/idf/tools/idf_tools.py", "install-python-env", "--enable-idf-version"]
# Override CMD to gunicorn after IDF env is set
ENTRYPOINT ["/bin/bash", "-c", \
    "source /opt/esp/idf/export.sh && gunicorn -w 2 -b 0.0.0.0:8765 --timeout 180 server:app"]
