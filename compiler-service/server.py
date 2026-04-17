"""
ESP32 Cloud Compiler Service
POST /compile  — compile C code for 立创实战派ESP32-S3
GET  /health   — health check
"""

import os
import uuid
import shutil
import subprocess
import logging
from pathlib import Path
from flask import Flask, request, jsonify, send_file

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

TEMPLATE_DIR = Path("/compiler/template")
BUILD_BASE   = Path("/tmp/builds")
IDF_PATH     = Path(os.environ.get("IDF_PATH", "/opt/esp/idf"))

BUILD_BASE.mkdir(exist_ok=True)


def create_project(build_dir: Path, code: str):
    """Copy template and inject user code into main/main.c"""
    shutil.copytree(TEMPLATE_DIR, build_dir)
    (build_dir / "main" / "main.c").write_text(code)


def run_build(build_dir: Path) -> tuple[bool, str]:
    """Run idf.py build, return (success, output)"""
    env = os.environ.copy()
    env["IDF_PATH"] = str(IDF_PATH)

    cmd = [
        str(IDF_PATH / "tools" / "idf.py"),
        "-B", str(build_dir / "build"),
        "build",
    ]

    try:
        result = subprocess.run(
            cmd,
            cwd=str(build_dir),
            env=env,
            capture_output=True,
            text=True,
            timeout=120,
        )
        output = result.stdout + "\n" + result.stderr
        return result.returncode == 0, output
    except subprocess.TimeoutExpired:
        return False, "Build timeout (120s)"
    except Exception as e:
        return False, str(e)


@app.route("/health")
def health():
    return jsonify({"status": "ok", "idf": str(IDF_PATH)})


@app.route("/compile", methods=["POST"])
def compile_code():
    data = request.get_json(force=True)
    code = data.get("code", "").strip()

    if not code:
        return jsonify({"error": "no code provided"}), 400

    job_id  = uuid.uuid4().hex[:8]
    build_dir = BUILD_BASE / job_id

    log.info(f"[{job_id}] Build started")

    try:
        create_project(build_dir, code)
        success, output = run_build(build_dir)

        if not success:
            log.warning(f"[{job_id}] Build FAILED")
            return jsonify({"error": "compilation failed", "output": output}), 400

        # Find the generated binary
        bin_path = build_dir / "build" / "app.bin"
        if not bin_path.exists():
            # Try project name
            candidates = list((build_dir / "build").glob("*.bin"))
            candidates = [p for p in candidates if "bootloader" not in p.name
                                                 and "partition" not in p.name]
            if not candidates:
                return jsonify({"error": "binary not found", "output": output}), 500
            bin_path = candidates[0]

        log.info(f"[{job_id}] Build OK → {bin_path.name} ({bin_path.stat().st_size} bytes)")

        return send_file(
            str(bin_path),
            mimetype="application/octet-stream",
            as_attachment=True,
            download_name="firmware.bin",
        )

    finally:
        # Cleanup build dir
        shutil.rmtree(build_dir, ignore_errors=True)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8765, debug=False)
