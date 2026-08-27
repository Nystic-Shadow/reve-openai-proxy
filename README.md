<div align="center">

# ⚡ Reve OpenAI-Compatible API Proxy
### *High-Performance, Multi-Account Ultra-HD Image Generation Engine*

[![GitHub Stars](https://img.shields.io/github/stars/Nystic-Shadow/reve-openai-proxy?style=for-the-badge&color=3B82F6)](https://github.com/Nystic-Shadow/reve-openai-proxy/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B%20%7C%20v20%2B%20%7C%20v22%2B-brightgreen.svg?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Docker Support](https://img.shields.io/badge/Docker-Ready-blue.svg?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![OpenAI Compatible](https://img.shields.io/badge/OpenAI%20API-100%25%20Compatible-orange.svg?style=for-the-badge&logo=openai)](https://platform.openai.com/docs/api-reference/images)
[![Hermes Agent](https://img.shields.io/badge/Hermes%20Agent-Plug%20%26%20Play-purple.svg?style=for-the-badge)](https://github.com/Nystic-Shadow/reve-openai-proxy)

<p align="center">
  <b>A blazing-fast, drop-in replacement proxy turning Reve.com's diffusion model into an OpenAI Images API (`/v1/images/generations`, `/v1/images/edits`, `/v1/models`).</b><br>
  <i>Built for Hermes Agent, Open WebUI, ComfyUI, LibreChat, Cursor, NextChat, Python & Node.js OpenAI SDKs.</i>
</p>

---

[Key Features](#-key-features) •
[Quick Start](#-quick-start) •
[Hermes Integration](#-hermes-agent-integration) •
[SDK Examples](#-sdk--api-examples) •
[Docker Deployment](#-docker-deployment) •
[Model Catalog](#-model-catalog) •
[Author](#-author)

---

</div>

## 🌟 Key Features

* 🚀 **Ultra High Quality (UHQ 4K/2K)**: Native high-resolution diffusion rendering up to 4096×4096 with full multi-pass denoising.
* 🔄 **Smart Multi-Account Router**:
  * **1 Token**: Runs in **Single Account Direct Mode**.
  * **2+ Tokens**: Automatically activates **Multi-Account Pool with Round-Robin & Instant Failover**.
* 🔑 **Dummy / Any API Key Accepted**: Plug it anywhere without strict token hassle (`sk-dummy`, `sk-random-key`, or empty).
* 🖥️ **Python `rich`-Style Terminal UI**: Beautiful boxed CLI with live energy gauges, status badges, and sub-millisecond request logs.
* 🎯 **100% DALL-E 3 / DALL-E 2 Drop-in Spec**:
  * Seamlessly handles DALL-E landscape (`1792x1024`), portrait (`1024x1792`), and square (`1024x1024`).
  * Supports both `b64_json` and `url` response formats.
* 🎨 **Image Inpainting & Edits**: Full support for `/v1/images/edits` via both `multipart/form-data` and JSON Base64/URL inputs.
* ⚡ **Connection Pooling & Parallel Batching**: HTTP Keep-Alive sockets with concurrent multi-account image generation (`n > 1`).

---

## 🏗️ System Architecture

```
                                    ┌─────────────────────────────────────────────────┐
                                    │    Client (Hermes / OpenAI SDK / Open WebUI)    │
                                    └───────────────────────┬─────────────────────────┘
                                                            │ HTTP POST /v1/images/generations
                                                            ▼
                                    ┌─────────────────────────────────────────────────┐
                                    │      Reve OpenAI Proxy (Port 5674 / Express)    │
                                    │      - Dummy Key Authentication                 │
                                    │      - Multi-Account Auto Load Balancer         │
                                    │      - DALL-E 3 -> Reve Dimension Mapper        │
                                    └──────────┬───────────────────────────┬──────────┘
                                               │                           │
                     Account 1 (Round-Robin)   │                           │ Account 2 (Failover)
                                               ▼                           ▼
                                ┌───────────────────────────┐ ┌───────────────────────────┐
                                │   Reve Backend (Token 1)  │ │   Reve Backend (Token 2)  │
                                │   POST runwf-stream       │ │   POST runwf-stream       │
                                └──────────────┬────────────┘ └─────────────┬─────────────┘
                                               │                            │
                                               ▼ SSE Multi-Pass Stream      ▼
                                    ┌─────────────────────────────────────────────────┐
                                    │   4K/2K Ultra-HD Output Parser & Base64 Decoder │
                                    └───────────────────────┬─────────────────────────┘
                                                            │ HTTP 200 JSON { b64_json }
                                                            ▼
                                    ┌─────────────────────────────────────────────────┐
                                    │          Rendered Ultra-HD Masterpiece          │
                                    └─────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Extract Your Reve Token(s)
1. Open [https://app.reve.com](https://app.reve.com) and log in.
2. Press **`F12`** to open Browser DevTools ➔ Go to **Console**.
3. Paste and run:
   ```javascript
   copy(localStorage.getItem('reve:bearer_token')); console.log(localStorage.getItem('reve:bearer_token'));
   ```
4. The token starting with `v2.login-...` is copied to your clipboard.

---

### 2. Configure `.env`
Create `.env` from `.env.example` and add your token(s):

```ini
PORT=5674
HOST=0.0.0.0

# Add as many accounts as you want (TOKEN_1, TOKEN_2, TOKEN_3, ...):
TOKEN_1=v2.login-your_first_account_token_here
TOKEN_2=v2.login-your_second_account_token_here
```

---

### 3. Start the Server

```bash
# Install dependencies
npm install

# Start the high-performance proxy
npm start
```

Your proxy will launch on **`http://localhost:5674`** with an interactive terminal UI:

```
  ██████╗ ███████╗██╗   ██╗███████╗    ██████╗ ██████╗  ██████╗ ██╗  ██╗██╗   ██╗
  ██╔══██╗██╔════╝██║   ██║██╔════╝    ██╔══██╗██╔══██╗██╔═══██╗╚██╗██╔╝╚██╗ ██╔╝
  ██████╔╝█████╗  ██║   ██║█████╗      ██████╔╝██████╔╝██║   ██║ ╚███╔╝  ╚████╔╝ 
  ██╔══██╗██╔══╝  ╚██╗ ██╔╝██╔══╝      ██╔═══╝ ██╔══██╗██║   ██║ ██╔██╗   ╚██╔╝  
  ██║  ██║███████╗ ╚████╔╝ ███████╗    ██║     ██║  ██║╚██████╔╝██╔╝ ██╗   ██║   
  ╚═╝  ╚═╝╚══════╝  ╚═══╝  ╚══════╝    ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   

  OpenAI-Compatible Image Generation API Proxy  •  v2.1.0
  Author / GitHub: https://github.com/Nystic-Shadow
```

---

## 🔌 Hermes Agent Integration

In your Hermes agent environment or configuration:

```bash
IMAGE_API_BASE=http://localhost:5674/v1
IMAGE_API_KEY=sk-dummy-key
IMAGE_MODEL=dall-e-3
```

---

## 💻 SDK & API Examples

### Python (Official OpenAI SDK)
```python
from openai import OpenAI
import base64

client = OpenAI(
    base_url="http://localhost:5674/v1",
    api_key="sk-dummy-anything"  # Any dummy key is accepted
)

response = client.images.generate(
    model="dall-e-3",
    prompt="A cinematic futuristic cyberpunk city at night, neon lights, rain, highly detailed, dramatic lighting",
    size="1792x1024",  # Landscape
    quality="hd",
    response_format="b64_json"
)

# Save to disk
image_bytes = base64.b64decode(response.data[0].b64_json)
with open("cyberpunk_city.png", "wb") as f:
    f.write(image_bytes)
print("Image saved as cyberpunk_city.png!")
```

---

### Node.js (Official OpenAI SDK)
```javascript
import OpenAI from "openai";
import fs from "fs";

const openai = new OpenAI({
  baseURL: "http://localhost:5674/v1",
  apiKey: "sk-dummy-anything",
});

async function generate() {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: "a majestic golden phoenix rising from neon flames, 8k uhd",
    size: "1024x1024",
  });

  const buffer = Buffer.from(response.data[0].b64_json, "base64");
  fs.writeFileSync("phoenix.png", buffer);
  console.log("Image saved as phoenix.png!");
}

generate();
```

---

### PowerShell
```powershell
$headers = @{
    "Authorization" = "Bearer dummy-api-key"
    "Content-Type"  = "application/json"
}

$body = @{
    model  = "dall-e-3"
    prompt = "A cinematic futuristic cyberpunk city at night, neon lights, rain"
    size   = "1024x1024"
    n      = 1
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5674/v1/images/generations" -Method POST -Headers $headers -Body $body
$bytes = [Convert]::FromBase64String($response.data[0].b64_json)
[IO.File]::WriteAllBytes("cyberpunk_city.png", $bytes)
Write-Output "Image saved successfully!"
```

---

### cURL
```bash
curl -X POST http://localhost:5674/v1/images/generations \
  -H "Authorization: Bearer sk-dummy" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "dall-e-3",
    "prompt": "a golden vintage pocket watch on dark velvet, studio lighting",
    "size": "1792x1024"
  }' | jq -r '.data[0].b64_json' | base64 -d > watch.png
```

---

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)
```bash
# Start container in detached mode
docker compose up -d

# View live logs
docker compose logs -f

# Stop container
docker compose down
```

### Using Plain Docker
```bash
docker build -t reve-openai-proxy .
docker run -d --name reve-openai-proxy -p 5674:5674 --env-file .env reve-openai-proxy
```

---

## 🎨 Model Catalog

| Model ID | Target Engine | Capabilities | Best For |
|---|---|---|---|
| **`dall-e-3`** | Reve Flagship UHD | `text2image`, `edits` | High-detail realistic scenes & artwork |
| **`dall-e-2`** | Reve Standard | `text2image`, `edits` | Quick generation & testing |
| **`reve-1`** | Reve Direct Core | `text2image`, `edits` | Direct Reve pipeline |
| **`reve-2` / `reve-preview`** | Reve Next-Gen Engine | `text2image`, `edits` | Advanced prompt composition |
| **`reve-fast`** | Reve Turbo | `text2image` | Rapid prototyping |

---

## 📐 Aspect Ratio & Resolution Matrix

| Parameter / Aspect Ratio | Rendered Canvas Resolution | Optimal Framing |
|---|---|---|
| `1:1` or `1024x1024` | **2048 × 2048 (2K UHD)** | Avatars, Album Covers, Social Squares |
| `16:9` or `1792x1024` | **2560 × 1440 (QHD Widescreen)** | Desktop Wallpapers, YouTube Banners, Landscapes |
| `9:16` or `1024x1792` | **1440 × 2560 (QHD Portrait)** | Mobile Wallpapers, Stories, Vertical Art |
| `21:9` | **2560 × 1080 (Ultrawide)** | Cinematic scenes |
| `4:3` / `3:4` | **2048 × 1536 / 1536 × 2048** | Classic Photography |

---

## 🚦 Endpoints Summary

| Method | Route | Description |
|---|---|---|
| `POST` | `/v1/images/generations` | OpenAI Text-to-Image Generation |
| `POST` | `/v1/images/edits` | OpenAI Image Inpainting & Edits (`multipart/form-data` & JSON) |
| `GET` | `/v1/models` | OpenAI Standard Model List (JSON) |
| `GET` | `/models` | Direct Model Catalog View (JSON) |
| `GET` | `/health` or `/` | Service & Multi-Account Pool Health Summary (JSON) |
| `POST` | `/sync` | Force dynamic balance & token refresh |

---

## 👤 Author

Developed and maintained by **[Nystic-Shadow](https://github.com/Nystic-Shadow)**.

⭐ **If you find this project useful, please consider giving it a star on GitHub!**

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
