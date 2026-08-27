<div align="center">

# ⚡ Reve OpenAI-Compatible API Proxy
### 🚀 *Ultra-HD 4K AI Image Generation Engine with Multi-Account Load Balancing*

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=0,2,25,45,65,85,100&text=Reve%20OpenAI%20Proxy&fontSize=60&fontAlignY=38&desc=High-Performance%20OpenAI-Compatible%20Image%20Generation%20API&descFontSize=20&descAlignY=60&height=240&animation=twinkling" width="100%" alt="Header Banner"/>
</p>

[![GitHub Stars](https://img.shields.io/github/stars/Nystic-Shadow/reve-openai-proxy?style=for-the-badge&logo=starship&color=3B82F6&logoColor=white)](https://github.com/Nystic-Shadow/reve-openai-proxy/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/Nystic-Shadow/reve-openai-proxy?style=for-the-badge&logo=git&color=8B5CF6&logoColor=white)](https://github.com/Nystic-Shadow/reve-openai-proxy/network/members)
[![License: MIT](https://img.shields.io/badge/License-MIT-10B981.svg?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B%20%7C%20v20%2B%20%7C%20v22%2B-22C55E.svg?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Docker Support](https://img.shields.io/badge/Docker-Container%20Ready-0EA5E9.svg?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![OpenAI Compatible](https://img.shields.io/badge/OpenAI%20API-100%25%20Compatible-F97316.svg?style=for-the-badge&logo=openai&logoColor=white)](https://platform.openai.com/docs/api-reference/images)

<br/>

<p align="center">
  <b>A blazing-fast proxy that converts Reve.com into a standard OpenAI Images API (`/v1/images/generations`, `/v1/images/edits`, `/v1/models`).</b><br>
  <i>Works seamlessly with <b>ANY</b> AI agent, frontend, SDK, or framework without modification.</i>
</p>

---

[✨ Key Features](#-key-features) •
[🎨 Supported Models](#-supported-models) •
[📐 4K Resolution Matrix](#-4k-resolution--aspect-ratio-matrix) •
[🌐 Universal Compatibility](#-universal-compatibility) •
[⚡ Quick Start](#-quick-start) •
[💻 SDK & Client Integrations](#-sdk--client-integrations) •
[🐳 Docker Setup](#-docker-deployment) •
[👤 Author](#-author)

---

</div>

## ✨ Key Features

* 💎 **Ultra-High-Definition (UHQ 4K/2K)**: Automatically renders crisp native **4096×4096** diffusion canvases with full multi-pass denoising.
* 🔄 **Smart Multi-Account Router**:
  * **1 Token**: Runs in **Single Account Direct Mode**.
  * **2+ Tokens**: Automatically activates **Multi-Account Pool with Round-Robin & Auto-Failover**.
* 🔑 **Universal Dummy Key Support**: Accepts any API key (`sk-dummy`, `sk-12345`, `not-used`, or none) for instant zero-friction setup.
* 🖥️ **Python `rich`-Style Terminal UI**: Beautiful bordered console with dynamic ASCII progress gauges, color-coded badges, and live latency stats.
* 🎯 **100% OpenAI Specification Parity**:
  * **Endpoints**: `/v1/images/generations`, `/v1/images/edits`, `/v1/models`, `/health`.
  * **Models**: `reve-1` (Flagship), `reve-2`, `reve-preview`, `reve-fast`.
  * **Formats**: `b64_json` (Base64) and `url` (Hosted image link).
* 🎨 **Inpainting & Image Edits**: Supports `/v1/images/edits` with both standard `multipart/form-data` file uploads and JSON Base64/URL inputs.
* ⚡ **Connection Pooling & Parallel Batching**: HTTP Keep-Alive sockets with concurrent multi-account generation when requesting `n > 1`.

---

## 🎨 Supported Models

| Model ID | Engine Target | Capabilities | Description |
|---|---|---|---|
| **`reve-fast`** | Reve Turbo Engine | `text2image`, `edits` | High-speed ultra-fast generation (**Default Model**) |
| **`reve-1`** | Reve Flagship UHD | `text2image`, `edits` | High-detail realistic scenes & artwork |
| **`reve-2`** | Reve Next-Gen Engine | `text2image`, `edits` | Advanced prompt composition & rendering |
| **`reve-preview`** | Reve Preview Engine | `text2image`, `edits` | Experimental latest pipeline |

---

## 📐 4K Resolution & Aspect Ratio Matrix

| Parameter / Aspect Ratio | Native Rendered Canvas | Best Use Case |
|---|---|---|
| `1:1` or `1024x1024` | **4096 × 4096 / 2048 × 2048 (UHD Square)** | Avatars, Profile Pictures, Album Covers |
| `16:9` or `1792x1024` | **2560 × 1440 (QHD Widescreen)** | Desktop Wallpapers, YouTube Covers, Landscapes |
| `9:16` or `1024x1792` | **1440 × 2560 (QHD Portrait)** | Mobile Wallpapers, Instagram Stories, TikTok |
| `21:9` | **2560 × 1080 (Ultrawide)** | Cinematic Concept Art, Panoramic Vistas |
| `4:3` / `3:4` | **2048 × 1536 / 1536 × 2048** | Classic Photography, Posters |

---

## 🌐 Universal Compatibility

You can plug this proxy into **literally any tool, UI, or library** that supports OpenAI or custom API Base URLs:

<div align="center">

| AI Agents & Frameworks | Web Frontends & Chat UIs | Developer Tools & IDEs | Programming SDKs |
|:---|:---|:---|:---|
| 🤖 **Hermes Agent** | 💬 **Open WebUI** | 💻 **Cursor IDE** | 🐍 **Python (`openai`)** |
| 🦜 **LangChain** | 🎨 **ComfyUI** | ⚡ **Continue.dev** | 🟨 **JavaScript / Node.js** |
| ⚡ **LiteLLM** | 📚 **LibreChat** | 🛠️ **Postman / Insomnia** | 🦀 **Rust (`async-openai`)** |
| 🧠 **AutoGPT** | 🌸 **LobeChat** | 📟 **cURL & PowerShell** | 🔷 **Go / C# / Java / PHP** |
| 🦾 **CrewAI** | 📱 **NextChat (ChatGPT-Next-Web)** | 🔌 **Dify.ai** | 🌐 **REST / HTTP** |

</div>

---

## 🏗️ System Architecture

```
                                    ┌────────────────────────────────────────────────────────┐
                                    │    Any Client (OpenAI SDK / WebUI / Agent / Script)   │
                                    └───────────────────────────┬────────────────────────────┘
                                                                │ HTTP POST /v1/images/generations
                                                                ▼
                                    ┌────────────────────────────────────────────────────────┐
                                    │      Reve OpenAI Proxy (Port 5674 / Express Engine)    │
                                    │      - Dummy Key Authentication Pass-Through           │
                                    │      - Multi-Account Auto Load Balancer & Failover     │
                                    │      - Native 4K/2K Canvas Resolution Engine           │
                                    └──────────────┬───────────────────────────┬─────────────┘
                                                   │                           │
                         Account 1 (Round-Robin)   │                           │ Account 2 (Auto-Failover)
                                                   ▼                           ▼
                                    ┌───────────────────────────┐ ┌───────────────────────────┐
                                    │   Reve Engine (Account 1) │ │   Reve Engine (Account 2) │
                                    │   POST /runwf-stream      │ │   POST /runwf-stream      │
                                    └──────────────┬────────────┘ └─────────────┬─────────────┘
                                                   │                            │
                                                   ▼ SSE Multi-Pass Stream      ▼
                                    ┌────────────────────────────────────────────────────────┐
                                    │   4K/2K Ultra-HD Output Parser & Base64 Decoder        │
                                    └───────────────────────────┬────────────────────────────┘
                                                                │ HTTP 200 JSON { b64_json }
                                                                ▼
                                    ┌────────────────────────────────────────────────────────┐
                                    │             Rendered 4096×4096 Masterpiece             │
                                    └────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Start

### 1. Extract Your Reve Bearer Token(s)
1. Open [https://app.reve.com](https://app.reve.com) in your browser and log in.
2. Press **`F12`** (or **`Ctrl + Shift + I`** / **`Cmd + Option + I`**) to open DevTools.
3. In the **Console** tab, paste and press **Enter**:
   ```javascript
   copy(localStorage.getItem('reve:bearer_token')); console.log(localStorage.getItem('reve:bearer_token'));
   ```
4. The token starting with `v2.login-...` is copied to your clipboard.

> [!TIP]
> **Multi-Account Token Extraction (Crucial Rule):**
> ⚠️ **DO NOT click the "Log Out" button** on Reve when grabbing tokens for multiple accounts, because clicking "Log Out" immediately revokes the session on Reve's servers.
> 
> **How to get multiple active tokens easily:**
> * Open an **Incognito / Private window** (or a separate browser profile / different browser).
> * Log into Account 1 ➔ Run the command in Console ➔ Paste into `TOKEN_1` ➔ **Simply close the window** (do not click Log Out).
> * Open a new Incognito window ➔ Log into Account 2 ➔ Copy token ➔ Paste into `TOKEN_2` ➔ **Close the window**.
> * Repeat for as many accounts as you want. All tokens will stay **permanently active simultaneously** in your load-balancing pool!

---

### 2. Configure `.env`
Create your `.env` file and add your token(s):

```ini
PORT=5674
HOST=0.0.0.0

# Add 1 token for Single Mode, or multiple for Auto-Round-Robin:
TOKEN_1=v2.login-your_first_account_token_here
TOKEN_2=v2.login-your_second_account_token_here
TOKEN_3=v2.login-your_third_account_token_here
```

---

### 3. Start the Server

```bash
# Install dependencies
npm install

# Start proxy
npm start
```

Your server starts on **`http://localhost:5674`** with an interactive rich terminal interface:

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

## 💻 SDK & Client Integrations

<details open>
<summary><b>🐍 Python (Official OpenAI SDK)</b></summary>

```python
from openai import OpenAI
import base64

client = OpenAI(
    base_url="http://localhost:5674/v1",
    api_key="sk-dummy-anything"  # Any dummy key is accepted
)

# Text-to-Image Generation
response = client.images.generate(
    model="reve-fast",
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
</details>

<details>
<summary><b>🟨 Node.js / JavaScript (Official OpenAI SDK)</b></summary>

```javascript
import OpenAI from "openai";
import fs from "fs";

const openai = new OpenAI({
  baseURL: "http://localhost:5674/v1",
  apiKey: "sk-dummy-anything",
});

async function main() {
  const response = await openai.images.generate({
    model: "reve-fast",
    prompt: "a majestic golden phoenix rising from neon flames, 8k uhd",
    size: "1024x1024",
  });

  const buffer = Buffer.from(response.data[0].b64_json, "base64");
  fs.writeFileSync("phoenix.png", buffer);
  console.log("Image saved as phoenix.png!");
}

main();
```
</details>

<details>
<summary><b>🤖 Hermes Agent Integration</b></summary>

In your Hermes agent environment or config file:
```bash
IMAGE_API_BASE=http://localhost:5674/v1
IMAGE_API_KEY=sk-dummy-key
IMAGE_MODEL=reve-fast
```
</details>

<details>
<summary><b>💬 Open WebUI & LibreChat Setup</b></summary>

1. In Open WebUI or LibreChat Settings ➔ **Image Generation**:
2. Set **API Engine**: `OpenAI`
3. Set **API Base URL**: `http://localhost:5674/v1`
4. Set **API Key**: `sk-dummy`
5. Set **Default Model**: `reve-fast`
</details>

<details>
<summary><b>📟 PowerShell</b></summary>

```powershell
$headers = @{
    "Authorization" = "Bearer dummy-api-key"
    "Content-Type"  = "application/json"
}

$body = @{
    model  = "reve-fast"
    prompt = "A cinematic futuristic cyberpunk city at night, neon lights, rain"
    size   = "1024x1024"
    n      = 1
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5674/v1/images/generations" -Method POST -Headers $headers -Body $body
$bytes = [Convert]::FromBase64String($response.data[0].b64_json)
[IO.File]::WriteAllBytes("cyberpunk_city.png", $bytes)
Write-Output "Image saved successfully as cyberpunk_city.png!"
```
</details>

<details>
<summary><b>⚡ cURL</b></summary>

```bash
curl -X POST http://localhost:5674/v1/images/generations \
  -H "Authorization: Bearer sk-dummy" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "reve-fast",
    "prompt": "a golden vintage pocket watch on dark velvet, studio lighting",
    "size": "1792x1024"
  }' | jq -r '.data[0].b64_json' | base64 -d > watch.png
```
</details>

---

## 🐳 Docker Deployment

### Docker Compose (Recommended)
```bash
# Start container in detached mode
docker compose up -d

# View live logs
docker compose logs -f

# Stop container
docker compose down
```

### Standalone Docker Run
```bash
docker build -t reve-openai-proxy .
docker run -d --name reve-openai-proxy -p 5674:5674 --env-file .env reve-openai-proxy
```

---

## 🚦 Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/images/generations` | OpenAI Text-to-Image Generation |
| `POST` | `/v1/images/edits` | OpenAI Image Inpainting & Edits (`multipart/form-data` & JSON) |
| `GET` | `/v1/models` | OpenAI Standard Model List (JSON) |
| `GET` | `/models` | Direct Model Catalog View (JSON) |
| `GET` | `/health` or `/` | Service & Multi-Account Pool Health Summary (JSON) |
| `POST` | `/sync` | Force dynamic balance & token refresh |

---

## 👤 Author

Developed and maintained with ❤️ by **[Nystic-Shadow](https://github.com/Nystic-Shadow)**.

⭐ **If you find this project helpful, please give it a star on GitHub!**

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
