# 🚀 AI BUSINESS ANALYST SYSTEM (FINAL BUILD – OLLAMA LOCAL)

**Excel → Auto Detect → KPI → Insight → Recommendation → Report (100% Local AI)**

---

# 🎯 OBJECTIVE

Bangun sistem automation yang:

* Upload Excel apa pun
* Auto detect jenis dataset
* Detect metric & struktur
* Generate KPI otomatis
* Analisa + insight + anomaly
* Kasih rekomendasi bisnis
* **Jalan pakai AI lokal (Ollama, tanpa API external)**

👉 Target: **decision-support system yang bisa dipakai offline + hemat biaya**

---

# 🧱 SYSTEM ARCHITECTURE

```id="m3h2zv"
[Upload Excel]
      ↓
[Parsing - Pandas]
      ↓
[Dataset Detection (Hybrid)]
      ↓
[Metric Detection (Hybrid)]
      ↓
[KPI Generator]
      ↓
[Ollama AI Engine (Local LLM)]
      ↓
[Insight + Recommendation]
      ↓
[Export Report]
```

---

# ⚙️ TECH STACK

* Python
* FastAPI
* Pandas
* Openpyxl
* Ollama (Local LLM)

---

# 📦 INSTALL DEPENDENCY

```bash id="a1z8pm"
pip install fastapi uvicorn pandas openpyxl python-dotenv requests
```

---

# 🧠 INSTALL OLLAMA

Install:
👉 https://ollama.com

Run model:

```bash id="y0q3vk"
ollama pull llama3
ollama run llama3
```

👉 Rekomendasi:

* llama3 (ringan)
* mistral (lebih cepat)
* mixtral (lebih pintar, berat)

---

# 📁 PROJECT STRUCTURE

```id="q9o7lx"
ai-business-analyst/
│
├── app/
│   ├── main.py
│   ├── routes/
│   │   └── analyze.py
│   ├── services/
│   │   ├── excel_parser.py
│   │   ├── analyzer.py
│   │   ├── dataset_detector.py
│   │   ├── metric_mapper.py
│   │   ├── kpi_generator.py
│   │   ├── ai_engine.py   <-- (OLLAMA)
│   │   └── report_generator.py
│
├── uploads/
├── outputs/
```

---

# 🚀 MAIN APP

## app/main.py

```python id="n8t2dl"
from fastapi import FastAPI
from app.routes import analyze

app = FastAPI(title="AI Business Analyst - Ollama")

app.include_router(analyze.router)
```

---

# 📥 ROUTE

## app/routes/analyze.py

```python id="zj5wkt"
from fastapi import APIRouter, UploadFile, File
import shutil, os

from app.services.excel_parser import parse_excel
from app.services.analyzer import process_data
from app.services.dataset_detector import detect_dataset
from app.services.ai_engine import run_ai_analysis
from app.services.report_generator import generate_report

router = APIRouter()
UPLOAD_DIR = "uploads"

@router.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    df = parse_excel(file_path)

    dataset_type = detect_dataset(df)
    structured = process_data(df)

    ai_result = run_ai_analysis(structured, dataset_type)

    output_file = generate_report(structured, ai_result)

    return {
        "dataset_type": dataset_type,
        "kpis": structured["kpis"],
        "output_file": output_file,
        "ai_result": ai_result
    }
```

---

# 📊 EXCEL PARSER

```python id="o0ujpm"
import pandas as pd

def parse_excel(file_path):
    return pd.read_excel(file_path)
```

---

# 🧠 ANALYZER + METRIC DETECTION

```python id="1n9v0g"
import pandas as pd
from app.services.metric_mapper import map_metrics
from app.services.kpi_generator import generate_kpis

def classify_columns(df):
    result = {"metrics": [], "dimensions": [], "time": []}

    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            result["metrics"].append(col)
        elif pd.api.types.is_datetime64_any_dtype(df[col]):
            result["time"].append(col)
        else:
            result["dimensions"].append(col)

    return result


def process_data(df):
    base = classify_columns(df)
    mapped = map_metrics(df.columns)

    df, kpis = generate_kpis(df, mapped)

    return {
        "structure": base,
        "mapped_metrics": mapped,
        "kpis": kpis,
        "columns": list(df.columns),
        "preview": df.head(20).to_dict(),
        "stats": df.describe(include='all').fillna(0).to_dict()
    }
```

---

# 🧩 DATASET DETECTOR

```python id="n3f5t9"
def detect_by_columns(columns):
    columns = [c.lower() for c in columns]

    if any(c in columns for c in ["revenue", "sales", "omzet"]):
        return "sales"

    if any(c in columns for c in ["stock", "inventory"]):
        return "inventory"

    if any(c in columns for c in ["expense", "cost", "profit"]):
        return "finance"

    if any(c in columns for c in ["click", "ctr"]):
        return "marketing"

    return "unknown"


def detect_dataset(df):
    result = detect_by_columns(df.columns)
    return result
```

---

# 🧠 METRIC MAPPER

```python id="5cfu9k"
METRIC_KEYWORDS = {
    "revenue": ["revenue", "sales", "omzet"],
    "cost": ["cost", "expense", "biaya"],
    "profit": ["profit", "laba"],
    "quantity": ["qty", "jumlah", "unit"]
}

def map_metrics(columns):
    mapped = {}

    for col in columns:
        col_lower = col.lower()

        for key, words in METRIC_KEYWORDS.items():
            if any(w in col_lower for w in words):
                mapped[col] = key

    return mapped
```

---

# 🔥 KPI GENERATOR

```python id="n7t1jc"
def generate_kpis(df, mapped_metrics):
    kpis = {}

    reverse_map = {}
    for col, key in mapped_metrics.items():
        reverse_map.setdefault(key, []).append(col)

    if "revenue" in reverse_map and "cost" in reverse_map:
        rev = reverse_map["revenue"][0]
        cost = reverse_map["cost"][0]
        df["profit"] = df[rev] - df[cost]
        kpis["profit"] = df["profit"].sum()

    if "revenue" in reverse_map and "quantity" in reverse_map:
        rev = reverse_map["revenue"][0]
        qty = reverse_map["quantity"][0]
        df["avg_price"] = df[rev] / df[qty].replace(0, 1)
        kpis["avg_price"] = df["avg_price"].mean()

    if "profit" in df.columns and "revenue" in reverse_map:
        rev = reverse_map["revenue"][0]
        df["margin"] = df["profit"] / df[rev].replace(0, 1)
        kpis["margin"] = df["margin"].mean()

    return df, kpis
```

---

# 🤖 OLLAMA AI ENGINE (CORE)

## app/services/ai_engine.py

```python id="y5hx7n"
import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3"

def call_ollama(prompt):

    response = requests.post(OLLAMA_URL, json={
        "model": MODEL,
        "prompt": prompt,
        "stream": False
    })

    return response.json()["response"]


def run_ai_analysis(data, dataset_type):

    kpis = data.get("kpis", {})

    prompt = f"""
You are a senior business analyst.

Dataset type: {dataset_type}

KPIs:
{kpis}

Analyze this data and provide:

1. Summary
2. Key insights
3. Critical problems
4. Business recommendations

Data:
{data}
"""

    return call_ollama(prompt)
```

---

# 📄 REPORT GENERATOR

```python id="u1lcz9"
import pandas as pd
import os

OUTPUT_DIR = "outputs"

def generate_report(data, ai_result):
    path = os.path.join(OUTPUT_DIR, "report.xlsx")

    with pd.ExcelWriter(path) as writer:
        pd.DataFrame(data["preview"]).to_excel(writer, "Preview")
        pd.DataFrame(data["stats"]).to_excel(writer, "Stats")

        pd.DataFrame(
            list(data["kpis"].items()),
            columns=["KPI", "Value"]
        ).to_excel(writer, "KPIs")

        pd.DataFrame({"AI Analysis": [ai_result]}).to_excel(writer, "Insights")

    return path
```

---

# ▶️ RUN SYSTEM

```bash id="q3m8d1"
uvicorn app.main:app --reload
```

Open:

```id="o4s7fe"
http://127.0.0.1:8000/docs
```

---

