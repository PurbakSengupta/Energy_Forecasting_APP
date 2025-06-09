# Human-Centered AI Forecasting System 🌤️⚡

This project is an AI-powered energy forecasting platform built with a TypeScript-based frontend and a Python FastAPI backend. It integrates advanced models like LSTM, Transformer, and CNN-LSTM along with explainability using SHAP, and supports live SHAP-based explanations via Ollama.

---

## 🔧 Project Structure
HCAI/
│
├── frontend/ → Frontend app (React/Vite + TailwindCSS)
├── backend/ → Backend API (FastAPI + ML models + SHAP)
│ └── main.py
│ └── ml/ transforms.py → Signal transformations
│     └── ml/ models/ → models

---

## 🚀 Features

- Energy forecasting (Currently a prototype model, can be enhanced to support more features)
- Support for signal transforms: DCT, DWT, CS
- Model support: LSTM, Transformer, CNN-LSTM
- SHAP-based model explainability
- Live explanation with local LLM via [Ollama](https://ollama.com/)

---

## 🖥️ Frontend Setup (Vite + TailwindCSS)

```bash
cd frontend
npm install
npm run dev
Access the app at: http://localhost:5173
```

## 🧠 Backend Setup (FastAPI + ML)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
API runs at: http://127.0.0.1:8000
```

---

## 🤖 Ollama Setup (for Local LLM)
Don't forget to start Ollama before running the frontend and backend!!
Install Ollama for local LLMs:

curl -fsSL https://ollama.com/install.sh | sh
ollama run llama3
This should run the LLM locally and enable dynamic SHAP explanations.



---

## 📡 API Endpoints
Method	  Endpoint          Description
POST	    /forecast	        Get forecast from time series
POST	    /explain	        Get SHAP explanation of forecast
POST	    /apply-transform	Apply DCT, DWT, or CS to input signals


---

## 📂 Requirements
All Python dependencies for backend are listed in backend/requirements.txt.

To set up a clean virtual environment:

python -m venv hcai
source hcai/bin/activate  # on Windows: hcai\Scripts\activate
pip install -r backend/requirements.txt

🧪 Model Files
All model files are stored under backend/ml/models/. Pre-trained .h5 files and SHAP explainers are included.
