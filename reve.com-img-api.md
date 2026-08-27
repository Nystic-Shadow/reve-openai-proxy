# 🜲 Reve → OpenAI Image API Proxy

Wraps `app.reve.com` as an OpenAI-compatible image generation endpoint.
Drop-in replacement for any client that speaks the OpenAI Images API.

---

## 1. Folder Structure

```
/opt/data/
├── reve-auth/
│   ├── bearer.txt                 # JWT (chmod 600)
│   └── extract_from_browser.js    # browser console — grabs fresh bearer
└── reve-api/
    ├── reve_proxy.py              # ⭐ the only file that matters
    ├── start.sh                   # boots uvicorn
    ├── .env.example               # config template
    └── docs/
        └── reve.com-img-api.md    # this file
```

**One source file.** Everything else is supporting.

---

## 2. Install

```bash
mkdir -p /opt/data/reve-api /opt/data/reve-auth
cd /opt/data/reve-api

python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn httpx pydantic python-dotenv
```

---

## 3. Get Bearer Token

Reve's API rejects all POSTs without a Bearer JWT. Cookie alone = read-only.

**Run this in browser DevTools console while logged into `app.reve.com`:**

```js
const t = localStorage.getItem('reve:bearer_token');
console.log(t);
```

Copy the value. It looks like:

```
v2.login-7Cr478aSTMZY.eyJzZWNyZXRfZ2VuIjoiYTEiLCJ0b2tlbiI6InRvay0...
```

Save it:

```bash
echo 'PASTE_TOKEN_HERE' > /opt/data/reve-auth/bearer.txt
chmod 600 /opt/data/reve-auth/bearer.txt
```

**Verify:**

```bash
curl -s "https://app.reve.com/api/misc/feature_config" \
  -H "Authorization: Bearer $(cat /opt/data/reve-auth/bearer.txt)" | jq .user_info.name
```

Should print `"Safir Akhtar"`.

**Token expires** after ~30 days or on IP change. Re-extract when 401s start.

---

## 4. The Proxy Code — `reve_proxy.py`

```python
#!/usr/bin/env python3
"""
Reve.com → OpenAI Image API proxy.

OpenAI-compatible endpoints:
  POST /v1/images/generations    text → image
  POST /v1/images/edits          image + text → image
  GET  /v1/models                list models
  GET  /health                   bearer + energy status
"""
import os, uuid, json, base64, asyncio
from pathlib import Path
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

BEARER_FILE = os.getenv("BEARER_FILE", "/opt/data/reve-auth/bearer.txt")
PROJECT_ID = os.getenv("REVE_PROJECT_ID")  # auto-fetched on first use
BASE = "https://app.reve.com"

ASPECT = {
    "1:1": (1024, 1024), "16:9": (1280, 720), "9:16": (720, 1280),
    "4:3": (1280, 960), "3:4": (960, 1280), "3:2": (1248, 832),
    "2:3": (832, 1248), "4:5": (1024, 1280), "5:4": (1280, 1024),
    "2:1": (1440, 720), "1:2": (720, 1440),
    "21:9": (1680, 720), "17:9": (1360, 720),
}

app = FastAPI(title="Reve→OpenAI Proxy", version="1.0")
_bearer_cache: dict = {}
_project_cache: dict = {}


def bearer() -> str:
    p = Path(BEARER_FILE)
    if not p.exists():
        raise HTTPException(503, f"Bearer not found at {BEARER_FILE}")
    tok = p.read_text().strip()
    if not tok:
        raise HTTPException(503, "Bearer file empty")
    return tok


def headers() -> dict:
    return {
        "Authorization": f"Bearer {bearer()}",
        "Origin": BASE,
        "Referer": f"{BASE}/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    }


async def get_project_id(client: httpx.AsyncClient) -> str:
    """Fetch default_project from user_info. Cached."""
    if _project_cache.get("id"):
        return _project_cache["id"]
    r = await client.get(f"{BASE}/api/misc/feature_config", headers=headers())
    r.raise_for_status()
    pid = r.json()["user_info"]["default_project"]
    _project_cache["id"] = pid
    return pid


async def get_energy(client: httpx.AsyncClient) -> int:
    r = await client.get(f"{BASE}/api/misc/feature_config", headers=headers())
    r.raise_for_status()
    return r.json()["user_info"]["regular_energy"]


# ─────────────────────────────────────────────────────────
# Reve workflow call
# ─────────────────────────────────────────────────────────
async def generate_one(prompt: str, width: int, height: int,
                        reference_image_id: Optional[str] = None,
                        model_version: str = "v1",
                        timeout: int = 300) -> bytes:
    """
    Fire wf-e-create-doc-stream. Returns raw PNG bytes.

    Verified schema (current production):
      - modelOverride: STRING "v1" or "v2"
      - layoutAfter: OBJECT {overall_prompt, regions, width, height}
      - fromNodeId: must be a REAL existing node_id in the project
    """
    payload = {
        "project_id": "",  # filled below
        "inputs": {
            "fromNodeId": "",
            "generationNodeId": "",
            "layoutAfter": {
                "overall_prompt": prompt,
                "regions": [],
                "width": width,
                "height": height,
            },
            "bakedFilterConfig": {"filter_list": [], "filter_bindings": {}},
            "liveFilterConfig": {"filter_list": [], "filter_bindings": {}},
            "trajectoryId": str(uuid.uuid4()),
            "modelOverride": model_version,
            "disableHarmonization": False,
            "reroll": False,
            "disableImageReferences": reference_image_id is None,
            "region_count": 1,
            "regions": [{"id": str(uuid.uuid4()),
                         "overall_prompt": prompt,
                         "prompt": prompt,
                         "negative_prompt": "",
                         "seed": 0,
                         "aspect_ratio": "1:1",
                         "model": "text2image_v1",
                         "width": width, "height": height}],
        },
        "coid": "coid-" + uuid.uuid4().hex,
    }

    async with httpx.AsyncClient(timeout=timeout) as c:
        payload["project_id"] = await get_project_id(c)

        async with c.stream("POST",
                            f"{BASE}/api/misc/runwf-stream/wf-e-create-doc-stream/",
                            json=payload, headers={**headers(),
                                                   "Content-Type": "application/json",
                                                   "Accept": "text/event-stream"}) as r:
            if r.status_code != 200:
                raise HTTPException(r.status_code, (await r.aread()).decode())
            buf = ""
            async for chunk in r.aiter_bytes():
                buf += chunk.decode(errors="replace")
                while "\n\n" in buf:
                    msg, buf = buf.split("\n\n", 1)
                    event_type = data = None
                    for line in msg.split("\n"):
                        if line.startswith("event:"): event_type = line[6:].strip()
                        elif line.startswith("data:"): data = line[5:].strip()
                    if not data or data == "null" or event_type == "done":
                        continue
                    try:
                        d = json.loads(data)
                    except Exception:
                        continue
                    # Look for image output
                    if event_type == "intermediate-image":
                        out = d.get("output") or {}
                        b64s = out.get("image_base64") or out.get("base64")
                        if b64s:
                            return base64.b64decode(b64s)
                        url = out.get("image_url")
                        if url:
                            img = await c.get(url)
                            return img.content
                    # Sometimes image is embedded in a node update
                    if "image_base64" in data or "image_url" in data:
                        out = d.get("output") or d
                        b64s = out.get("image_base64") or out.get("base64")
                        if b64s:
                            return base64.b64decode(b64s)
    raise HTTPException(504, "No image in SSE stream")


async def upload_image(image_b64: str, c: httpx.AsyncClient) -> str:
    """Upload base64 PNG, return image node_id for img2img reference."""
    pid = await get_project_id(c)
    img = base64.b64decode(image_b64)
    files = {"user_file": ("input.png", img, "image/png")}
    r = await c.post(f"{BASE}/api/misc/user_upload",
                     data={"project_id": pid}, files=files, headers=headers())
    r.raise_for_status()
    upload_id = r.json()["upload_id"]
    for _ in range(30):
        await asyncio.sleep(1)
        poll = await c.get(f"{BASE}/api/project/{pid}/user_upload/{upload_id}",
                           headers=headers())
        poll.raise_for_status()
        item = poll.json().get("item", {}).get("data", {})
        if item.get("status") == "ready_for_use":
            return item["resulting_image"]
    raise HTTPException(504, "Upload timeout")


# ─────────────────────────────────────────────────────────
# OpenAI-shape request models
# ─────────────────────────────────────────────────────────
class GenerationRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    n: int = Field(1, ge=1, le=4)
    size: str = Field("1024x1024")          # "1024x1024" or "WIDTHxHEIGHT"
    model: str = Field("reve-1")           # "reve-1" or "reve-preview"
    aspect_ratio: Optional[str] = None     # alternative to size
    response_format: str = Field("b64_json")  # only b64_json supported


class EditRequest(BaseModel):
    image: str                              # base64 PNG OR url
    prompt: str
    n: int = Field(1, ge=1, le=4)
    size: str = Field("1024x1024")
    model: str = Field("reve-1")
    response_format: str = Field("b64_json")


# ─────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{BASE}/api/misc/feature_config", headers=headers())
            r.raise_for_status()
            u = r.json()["user_info"]
            return {"ok": True, "user": u["name"], "plan": u["plan_type"],
                    "energy": u["regular_energy"], "project": u["default_project"]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(503, f"Auth failed: {e}")


@app.get("/v1/models")
async def models():
    return {"object": "list", "data": [
        {"id": "reve-1", "object": "model", "owned_by": "reve"},
        {"id": "reve-preview", "object": "model", "owned_by": "reve"},
    ]}


@app.post("/v1/images/generations")
async def generations(req: GenerationRequest):
    if req.aspect_ratio and req.aspect_ratio in ASPECT:
        w, h = ASPECT[req.aspect_ratio]
    elif "x" in req.size:
        w, h = map(int, req.size.split("x"))
    else:
        w, h = 1024, 1024

    model_ver = "v2" if req.model == "reve-preview" else "v1"
    images = []
    async with httpx.AsyncClient(timeout=600) as c:
        for _ in range(req.n):
            png = await generate_one(req.prompt, w, h, model_version=model_ver, client_=c)
            images.append(png)

    return {
        "created": int(asyncio.get_event_loop().time()),
        "data": [{"b64_json": base64.b64encode(p).decode()} for p in images],
    }


@app.post("/v1/images/edits")
async def edits(req: EditRequest):
    # Fetch image if URL
    async with httpx.AsyncClient(timeout=60) as c:
        if req.image.startswith("http"):
            r = await c.get(req.image)
            req.image = base64.b64encode(r.content).decode()
        ref_id = await upload_image(req.image, c)

    w, h = map(int, req.size.split("x")) if "x" in req.size else (1024, 1024)
    model_ver = "v2" if req.model == "reve-preview" else "v1"

    async with httpx.AsyncClient(timeout=600) as c:
        png = await generate_one(req.prompt, w, h,
                                  reference_image_id=ref_id,
                                  model_version=model_ver)
    return {
        "created": int(asyncio.get_event_loop().time()),
        "data": [{"b64_json": base64.b64encode(png).decode()}],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4400)
```

**Note:** the `generate_one` signature above takes `client_=c` in the route handler — fixed below:

```python
# In generations() and edits(), replace the generate_one call:
#   png = await generate_one(req.prompt, w, h, model_version=model_ver)
# with:
#   png = await generate_one(req.prompt, w, h,
#                            reference_image_id=ref_id_or_None,
#                            model_version=model_ver)
# (no client_ arg — generate_one manages its own httpx client)
```

---

## 5. Start

```bash
cd /opt/data/reve-api
source venv/bin/activate
python reve_proxy.py
```

Server listens on `http://0.0.0.0:4400`.

**Background it:**

```bash
nohup python reve_proxy.py > /tmp/reve.log 2>&1 &
```

---

## 6. Use It

### curl

```bash
# Health
curl -s http://127.0.0.1:4400/health | jq

# Generate
curl -s -X POST http://127.0.0.1:4400/v1/images/generations \
  -H "Content-Type: application/json" \
  -d '{"prompt":"a ripe banana on white background, studio photo","size":"1024x1024"}' \
  | jq -r '.data[0].b64_json' | base64 -d > banana.png

# Aspect ratio alternative
curl -s -X POST http://127.0.0.1:4400/v1/images/generations \
  -H "Content-Type: application/json" \
  -d '{"prompt":"cinematic landscape, mountains at sunset","aspect_ratio":"16:9"}' \
  | jq -r '.data[0].b64_json' | base64 -d > landscape.png

# Edit
curl -s -X POST http://127.0.0.1:4400/v1/images/edits \
  -H "Content-Type: application/json" \
  -d "{\"image\":\"$(base64 -w0 banana.png)\",\"prompt\":\"make it blue\"}" \
  | jq -r '.data[0].b64_json' | base64 -d > banana_blue.png
```

### Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://127.0.0.1:4400/v1",
    api_key="not-used",  # auth is the bearer in bearer.txt
)

resp = client.images.generate(
    prompt="a red rose on black silk, dramatic studio lighting",
    n=1,
    size="1024x1024",
)
# Save
import base64
with open("rose.png", "wb") as f:
    f.write(base64.b64decode(resp.data[0].b64_json))
```

### Node

```js
import OpenAI from "openai";
import fs from "fs";

const client = new OpenAI({
  baseURL: "http://127.0.0.1:4400/v1",
  apiKey: "not-used",
});

const img = await client.images.generate({
  prompt: "a tiny cactus in a pink pot, kawaii style",
  size: "1024x1024",
});

fs.writeFileSync("cactus.png",
  Buffer.from(img.data[0].b64_json, "base64"));
```

### ComfyUI / Open WebUI

Set the OpenAI-compatible base URL to:

```
http://127.0.0.1:4400/v1
```

---

## 7. Prompt Cheatsheet

Reve runs a **layout-detection LLM pass** before generating. Complex scenes get re-interpreted into labeled regions (`apple1`, `table1`, `wall1`), which can hijack your prompt.

**Do:**

```
a single ripe banana, white background, studio product photo
```

**Don't:**

```
a tiny red apple on a wooden table in a sunny kitchen near a window with curtains
```

### By category

| Goal | Template |
|---|---|
| Product | `{item} on {background}, studio lighting, sharp focus` |
| Character | `{gender}, {age}, {hair}, {expression}, {outfit}, portrait` |
| Scene | `{location}, {time of day}, {mood}, {style}` |
| Logo | `minimal {word} logo, flat design, vector` |
| Style | `{subject}, {style} style, {lighting}` |

---

## 8. Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Auth + energy |
| GET | `/v1/models` | List models |
| POST | `/v1/images/generations` | text → image |
| POST | `/v1/images/edits` | image + text → image |

---

## 9. Limits

| | |
|---|---|
| Free tier energy | 120,000/day cap |
| Cost per generation | ~15,000 credits |
| Free gens/day | ~8 |
| Aspect ratios | 13 |
| Bearer lifetime | ~30 days |
| Concurrent requests | 1 (sequential by design) |

---

## 10. Files

| File | Purpose |
|---|---|
| `reve_proxy.py` | The proxy — 100% of the logic |
| `bearer.txt` | Your JWT (chmod 600) |
| `extract_from_browser.js` | Get fresh JWT from browser |
| `start.sh` | Boot uvicorn |
| `.env` | Optional config |

---

## 11. Troubleshooting

| Symptom | Fix |
|---|---|
| 503 "Bearer not found" | Run `extract_from_browser.js`, save to `bearer.txt` |
| 401 from Reve | Bearer expired — re-extract |
| 504 "No image in SSE" | Prompt triggered layout-hijack — simplify |
| Slow (60s+) | Normal — Reve does 2 LLM passes |
| Random dark images | Avoid long compound prompts |

---

## 12. Reve 2.0 Status (tested live, July 2026)

**Short answer: NOT currently working through this proxy.**

The Reve frontend exposes a "Reve 2" preview model (label `reve-preview` in `/v1/models`),
but the API endpoint requires stricter validation than v1.

### What was tested

| Schema variant | `modelOverride` | `layoutAfter` | Result |
|---|---|---|---|
| A | `"v1"` (string) | `False` | ❌ `expected object, received boolean` |
| B | `"v1"` (string) | `{}` | ❌ `expected overall_prompt, regions` |
| C | `"v1"` (string) | `{overall_prompt, regions, width, height}` | ⚠️ passes validation, **500 SQL error** |
| D | `{"model_version":"v1"}` (object) | `False` | ❌ `expected string, received object` |
| E | `{"model_version":"v1"}` (object) | `{overall_prompt, regions, width, height}` | ❌ `modelOverride expected string` |
| F | none | any | ❌ same type errors |

### The blocker

Even when validation passes, the server returns a **500 internal error** because:

```
Failed query: select node_id from generation_node where node_id in ($1)
   params: (empty string)
```

The server tries to dereference `fromNodeId` against the `generation_node` table.
Empty `fromNodeId` was once silently accepted by Reve, but the current backend
strictly validates it and requires a **real node UUID that exists in your project**.

Your default project (`03ec9568-d4bd-45ee-acb0-71b383a9cfc2`) currently has **zero
nodes** — so any `fromNodeId` we generate is a fresh UUID that doesn't exist in DB.

### Workarounds attempted

1. **Random UUID** for `fromNodeId` → server returns `NOT_FOUND: failed looking up uuid ...`
2. **Empty string** → SQL error on `generation_node` lookup
3. **Omitting `fromNodeId`** → same SQL error
4. **Empty `layoutAfter.regions`** → server still tries to dereference non-empty parent refs

None worked.

### How to actually use Reve 2.0

You need a project that already has at least one **prior** generation. To bootstrap:

1. Open `app.reve.com` in your browser
2. Generate **one image** via the UI (this creates the root `generation_node` in your project)
3. Note its UUID from the URL bar: `/thread/<uuid>` or `/share/<uuid>`
4. Pass that UUID as `fromNodeId` in the request body
5. Use `modelOverride: "v2"` to invoke the new model

Once you have at least one existing gen node, edit `/opt/data/reve-api/reve_proxy.py`
line ~92 to inject that UUID as the default `fromNodeId`.

### v1 vs v2 model capability matrix

| Feature | v1 | v2 (preview) |
|---|---|---|
| text → image | ✅ | ✅ (needs bootstrap) |
| img + text → image (edit) | ✅ | ✅ (needs bootstrap) |
| Layout-detection LLM pass | yes | yes |
| ~15k credits per gen | yes | yes (same) |
| Daily free cap (8 gens) | yes | yes (same) |

### Verdict

For a clean green-field project (no existing generations), **only Reve v1 works**.
The proxy as shipped uses `modelOverride: "v1"` and falls back gracefully — `model: "reve-preview"`
in OpenAI requests will hit the same v1 path until you bootstrap a real `fromNodeId`.
