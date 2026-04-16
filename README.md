# SmartBiz Analyzer

AI-powered business analysis platform that automatically analyzes data from multiple file formats (Excel, CSV, PDF, DOCX) and delivers insights, recommendations, and interactive visualizations.

## Deploy (Free Hosting)

| Service | Platform | Link |
|---------|----------|------|
| Frontend | Vercel | [frontend-three-neon-89.vercel.app](https://frontend-three-neon-89.vercel.app) |
| Backend | Render | [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/herrihartono/Business-Analyzer-AI) |

## Tech Stack

**Backend:** FastAPI, Python, Polars, LangChain + OpenAI, SQLAlchemy, Redis  
**Frontend:** Next.js 16, TypeScript, React 19, Tailwind CSS, ShadCN UI, Recharts, Framer Motion

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.12+
- OpenAI API key (for AI insights)
- Redis (optional, for caching)

### Run with Docker Compose

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Edit .env files with your API keys

docker compose up --build
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

### Local Development

**Backend:**

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

## Features

- **Multi-format Upload** -- drag & drop Excel, CSV, PDF, DOCX files
- **Auto Analysis** -- detects business type, calculates KPIs, finds trends
- **AI Insights** -- LLM-powered recommendations and risk warnings
- **Smart Data Cleaning** -- fixes missing values, anomalies, type issues
- **Interactive Charts** -- line, bar, pie charts generated from your data
- **Data Explorer** -- sortable, filterable table view of parsed data
- **AI Chat** -- ask questions about your uploaded data
- **Dark Mode** -- full dark/light theme support

## Project Structure

```
├── backend/          # FastAPI application
│   ├── app/
│   │   ├── api/      # Route handlers
│   │   ├── models/   # DB models & schemas
│   │   ├── services/ # Business logic
│   │   └── utils/    # Helpers
│   └── uploads/      # File storage (dev)
├── frontend/         # Next.js application
│   └── src/
│       ├── app/      # Pages (App Router)
│       ├── components/
│       ├── hooks/
│       └── lib/      # API client & utils
└── docker-compose.yml
```

## License

MIT
