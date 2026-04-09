FROM python:3.12-slim

WORKDIR /app

# Dépendances système minimales (psycopg2 binary inclus dans requirements)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Dossier uploads par défaut (écrasé par le disk mount Render en production)
RUN mkdir -p /uploads

ENV UPLOAD_DIR=/uploads

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
