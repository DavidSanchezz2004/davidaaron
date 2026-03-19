FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    wget curl gnupg \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 \
    libxcomposite1 libxrandr2 libgbm1 \
    libgtk-3-0 libasound2 \
    libxdamage1 libxfixes3 \
    libxext6 libx11-6 \
    && rm -rf /var/lib/apt/lists/*

COPY . .

RUN pip install fastapi uvicorn playwright httpx pydantic

RUN playwright install chromium
RUN playwright install-deps

EXPOSE 8001

CMD ["uvicorn","bot_cookies:app","--host","0.0.0.0","--port","8001"]

