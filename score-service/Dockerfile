FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends libglib2.0-0 libgl1 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
# rapidocr pulls the non-headless OpenCV; keep only the headless build
RUN pip install --no-cache-dir -r requirements.txt && pip uninstall -y opencv-python opencv-contrib-python 2>/dev/null; \
    pip install --no-cache-dir --force-reinstall --no-deps opencv-python-headless==4.13.0.92
COPY . .
ENV PYTHONUNBUFFERED=1
EXPOSE 8100
HEALTHCHECK CMD python -c "import urllib.request as u; u.urlopen('http://localhost:8100/health')"
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8100", "--workers", "1"]
