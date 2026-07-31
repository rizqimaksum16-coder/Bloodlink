# Gunakan image Python
FROM python:3.10-slim

# Hugging Face Spaces mewajibkan aplikasi berjalan menggunakan user non-root
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

# Copy dan install requirements
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy semua file program dan model AI
COPY --chown=user . .

# Hugging Face Spaces secara default mengekspos port 7860
EXPOSE 7860

# Jalankan server FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
