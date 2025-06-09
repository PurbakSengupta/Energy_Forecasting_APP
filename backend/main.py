from fastapi import FastAPI, File, UploadFile, Form, Body, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import numpy as np
import joblib
import shap
import psutil
from pathlib import Path
import shap
import os
import requests
from transformers import pipeline
from tensorflow import keras
from fastapi.middleware.cors import CORSMiddleware
from ml.transforms import apply_dct, apply_dwt, apply_cs

# Initialize FastAPI app
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # or ["*"] if you're unsure
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Determine base path and model directory
BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / 'ml' / 'models'

# Global containers for loaded models and scaler
models = {}
scaler = None

# Check for local Ollama LLM availability (running on default localhost:11434)
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama2-uncensored"  # default model name for Ollama (adjust if needed)
try:
    # Ping Ollama API to see if it's running
    requests.get("http://localhost:11434", timeout=1)
    OLLAMA_AVAILABLE = True
except:
    OLLAMA_AVAILABLE = False

# HuggingFace pipeline for LLM (initialized only if needed)
hf_pipeline = None
HF_MODEL_NAME = "google/flan-t5-base"  # fallback LLM model (can be changed to any local free model)

# Pydantic models for request bodies
class ExplainRequest(BaseModel):
    question: str
    shap_values: dict

class FeedbackRequest(BaseModel):
    model: str
    feedback: str

class ShapRequest(BaseModel):
    model: str
    transform: str
    data: list  # List of list or list of floats

# Load pre-trained models into memory
try:
    models['lstm'] = keras.models.load_model(str(MODEL_DIR / 'lstm_model.h5'), compile=False)
    models['cnn_lstm'] = keras.models.load_model(str(MODEL_DIR / 'cnn_lstm_model.h5'), compile=False)
    models['transformer'] = keras.models.load_model(str(MODEL_DIR / 'transformer_model.h5'), compile=False)
    print("Models loaded:", list(models.keys()))
except Exception as e:
    print(f"Error loading models: {e}")

# Load scaler (for data normalization) if available
try:
    scaler = joblib.load(str(MODEL_DIR / 'scaler.save'))
except:
    scaler = None

def parse_input(file: UploadFile = None, data=None):
    """
    Parse input data from an uploaded CSV file or a JSON-provided list.
    Returns a numpy array of shape (timesteps, 1) containing the target series values.
    """
    values = []
    if file:
        content = file.file.read()
        if not content:
            raise ValueError("Uploaded file is empty")
        content_str = content.decode('utf-8', errors='ignore')
        lines = content_str.splitlines()
        for line in lines:
            if not line.strip():
                continue  # skip empty lines
            parts = line.strip().split(',')
            try:
                # Try to convert the entire row to floats
                row_vals = [float(x) for x in parts]
            except:
                # If conversion fails, likely the first column is non-numeric (e.g., a date or header)
                parts_without_first = parts[1:]
                if not parts_without_first:
                    continue
                try:
                    row_vals = [float(x) for x in parts_without_first]
                except:
                    continue  # skip this line if still not numeric
            # If multiple columns, take the last column as the target value
            if len(row_vals) > 1:
                values.append(row_vals[-1])
            else:
                values.append(row_vals[0])
        if not values:
            raise ValueError("No numeric data found in file (after skipping headers)")
        arr = np.array(values, dtype=float).reshape(-1, 1)
    elif data is not None:
        # Data given directly as JSON (flatten if nested)
        try:
            # flatten if list of lists
            flat_data = [item for sublist in data for item in (sublist if isinstance(sublist, list) else [sublist])]
            arr = np.array(flat_data, dtype=np.float32).reshape(-1, 1)  # shape: (timesteps, 1)
        except Exception as e:
            raise ValueError(f"Could not parse direct input data: {e}")

    else:
        raise ValueError("No input data provided.")
    return arr

@app.post("/predict")
async def predict_endpoint(request: Request):
    """
    Endpoint to get a model prediction for the next time step.
    Accepts JSON (with 'data') or multipart form (with file upload) input.
    Query parameters:
      - model: which model to use (e.g. 'lstm', 'cnn_lstm', 'transformer')
      - transform: optional transform to apply ('DCT', 'DWT', 'CS')
    """
    # Determine request content type and extract parameters accordingly
    content_type = request.headers.get("content-type", "")
    model_name = None
    transform_name = None
    input_data = None
    file_obj = None
    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        model_name = form.get("model")
        transform_name = form.get("transform") or None
        file_obj = form.get("file")
    else:
        body = await request.json()
        model_name = body.get("model")
        transform_name = body.get("transform") or None
        input_data = body.get("data")
    if not model_name:
        raise HTTPException(status_code=400, detail="Model name is required")
    if model_name not in models or models[model_name] is None:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' is not loaded or available")
    try:
        if file_obj is not None:
            if isinstance(file_obj, UploadFile):
                arr = parse_input(file=file_obj)
            else:
                raise HTTPException(status_code=400, detail="Invalid file upload")
        else:
            arr = parse_input(data=input_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Input parsing error: {e}")
    if arr.size == 0:
        raise HTTPException(status_code=400, detail="No data provided for prediction")
    # Adjust input length if model expects a fixed window size
    needed_len = None
    try:
        shape = models[model_name].input_shape  # e.g. (None, timesteps, features)
        if shape is not None and len(shape) >= 3:
            seq_len = shape[1]
            if seq_len is not None:
                needed_len = seq_len
    except:
        pass
    if needed_len:
        if arr.shape[0] < needed_len:
            raise HTTPException(
                status_code=400,
                detail=f"Input sequence too short for model (need ≥ {needed_len} timesteps)"
            )
        elif arr.shape[0] > needed_len:
            # Trim to the last `needed_len` timesteps
            arr = arr[-needed_len:]
    # Scale the data if a scaler was loaded (models trained on normalized data)
    if scaler:
        try:
            arr = scaler.transform(arr)
        except Exception as e:
            print(f"Warning: scaler.transform failed (skipping scaling): {e}")
    # Apply transformation if specified
    if transform_name:
        t = transform_name.lower()
        arr_series = arr.flatten()
        if t == 'dct':
            arr_trans = apply_dct(arr_series)
        elif t == 'dwt':
            arr_trans = apply_dwt(arr_series)
        elif t == 'cs':
            arr_trans = apply_cs(arr_series)
        else:
            arr_trans = arr_series  # unknown transform; proceed without transform
        arr_trans = np.array(arr_trans, dtype=float)
        if arr_trans.ndim == 1:
            arr_trans = arr_trans.reshape(-1, 1)
        elif arr_trans.ndim == 0:
            arr_trans = np.array([float(arr_trans)]).reshape(-1, 1)
        arr = arr_trans
    # Prepare input shape for prediction: (batch=1, timesteps, features)
    # Ensure correct shape: (1, timesteps, 1)
    if arr.shape[0] == 1:  # (1, N)
        arr_input = arr.T.reshape(1, -1, 1)
    else:  # (N, 1)
        arr_input = arr.reshape(1, arr.shape[0], arr.shape[1])
    try:
        y_pred = models[model_name].predict(arr_input)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model prediction failed: {e}")
    # Inverse transform the prediction back to original scale if scaler is available
    y_pred_val = y_pred
    if scaler:
        try:
            if hasattr(scaler, "inverse_transform"):
                y_pred_val = scaler.inverse_transform(y_pred_val)
        except Exception as e:
            print(f"Warning: inverse_transform failed: {e}")
    # Extract the scalar prediction value
    try:
        y_value = float(y_pred_val.flatten()[0])
    except:
        # If model returns multiple outputs, convert all to list (not expected in /predict)
        y_value = y_pred_val.flatten().tolist()
    return {"prediction": y_value}

@app.post("/forecast")
async def forecast_endpoint(request: Request):
    """
    Endpoint to get a multi-step forecast.
    Accepts the same inputs as /predict plus an optional 'horizon' parameter for number of future steps.
    """
    content_type = request.headers.get("content-type", "")
    model_name = None
    transform_name = None
    input_data = None
    file_obj = None
    horizon = 10  # default forecast horizon
    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        model_name = form.get("model")
        transform_name = form.get("transform") or None
        if form.get("horizon"):
            try:
                horizon = int(form.get("horizon"))
            except:
                raise HTTPException(status_code=400, detail="Horizon must be an integer")
        file_obj = form.get("file")
    else:
        body = await request.json()
        model_name = body.get("model")
        transform_name = body.get("transform") or None
        if body.get("horizon") is not None:
            try:
                horizon = int(body.get("horizon"))
            except:
                raise HTTPException(status_code=400, detail="Horizon must be an integer")
        input_data = body.get("data")
    if not model_name:
        raise HTTPException(status_code=400, detail="Model name is required")
    if model_name not in models or models[model_name] is None:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' is not loaded or available")
    try:
        if file_obj is not None:
            if isinstance(file_obj, UploadFile):
                arr = parse_input(file=file_obj)
            else:
                raise HTTPException(status_code=400, detail="Invalid file upload")
        else:
            arr = parse_input(data=input_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Input parsing error: {e}")
    if arr.size == 0:
        raise HTTPException(status_code=400, detail="No data provided for forecast")
    # Adjust input sequence length if model expects a fixed window size
    needed_len = None
    try:
        shape = models[model_name].input_shape  # e.g. (None, timesteps, features)
        if shape is not None and len(shape) >= 3:
            seq_len = shape[1]
            if seq_len is not None:
                needed_len = seq_len
    except:
        pass
    if needed_len:
        if arr.shape[0] < needed_len:
            raise HTTPException(
                status_code=400,
                detail=f"Input sequence too short for model (need ≥ {needed_len} timesteps)"
            )
        elif arr.shape[0] > needed_len:
            # Trim to the last `needed_len` timesteps
            arr = arr[-needed_len:]
        window_size = needed_len
    else:
        # If model can handle variable length, use current length as window
        window_size = arr.shape[0]
    # Scale the data if a scaler was loaded (models trained on normalized data)
    if scaler:
        try:
            arr = scaler.transform(arr)
        except Exception as e:
            print(f"Warning: scaler.transform failed (skipping scaling): {e}")
    # Apply transformation if specified
    if transform_name:
        t = transform_name.lower()
        arr_series = arr.flatten()
        if t == 'dct':
            arr_trans = apply_dct(arr_series)
        elif t == 'dwt':
            arr_trans = apply_dwt(arr_series)
        elif t == 'cs':
            arr_trans = apply_cs(arr_series)
        else:
            arr_trans = arr_series
        arr_trans = np.array(arr_trans, dtype=float)
        if arr_trans.ndim == 1:
            arr_trans = arr_trans.reshape(-1, 1)
        elif arr_trans.ndim == 0:
            arr_trans = np.array([float(arr_trans)]).reshape(-1, 1)
        arr = arr_trans
        # If transform changed length, adjust window size if no fixed length
        if not needed_len:
            window_size = arr.shape[0]
    predictions = []
    for i in range(horizon):
        # Ensure correct shape: (1, timesteps, 1)
        if arr.shape[0] == 1:  # (1, N)
            arr_input = arr.T.reshape(1, -1, 1)
        else:  # (N, 1)
            arr_input = arr.reshape(1, arr.shape[0], arr.shape[1])
        try:
            y_pred = models[model_name].predict(arr_input)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Model prediction failed during forecast: {e}")
        # Assume single-step output
        if hasattr(y_pred, "flatten"):
            y_val = float(y_pred.flatten()[0])
        else:
            raise HTTPException(status_code=500, detail="Model output is not numeric")
        predictions.append(y_val)
        # Slide the window: append new prediction, drop oldest
        new_val = np.array([[y_val]], dtype=float)
        arr = arr.reshape(-1, 1)  # enforce 2D shape
        arr = np.vstack([arr[1:], new_val])
    # Inverse scale the predictions list if applicable
    if scaler:
        try:
            if hasattr(scaler, "inverse_transform"):
                inv_preds = scaler.inverse_transform(np.array(predictions).reshape(-1, 1))
                predictions = inv_preds.flatten().tolist()
        except Exception as e:
            print(f"Warning: inverse_transform on predictions failed: {e}")

    # Create a simple baseline from the last observed values (same length as forecast)
    baseline_values = arr.flatten().tolist()[-len(predictions):]
    
    return {
        "forecast": predictions,
        "baseline": baseline_values
    }

@app.post("/explain")
async def explain_endpoint(req: ExplainRequest):
    """
    Endpoint to get an AI-generated explanation for a prediction.
    Expects a question and corresponding SHAP values in the request body.
    """
    global hf_pipeline
    question = req.question
    shap_values = req.shap_values
    # Format SHAP values for the LLM prompt (e.g., "feature1: 0.5, feature2: -0.3, ...")
    if isinstance(shap_values, dict):
        shap_str = ", ".join([f"{k}: {v}" for k, v in shap_values.items()])
    else:
        shap_str = str(shap_values)
    # Construct a prompt that provides context and the user's question to the LLM
    prompt = (f"Given the following SHAP feature contributions: {shap_str}\n"
              f"Question: {question}\n"
              "Answer:")
    answer_text = ""
    if OLLAMA_AVAILABLE:
        # Use Ollama local LLM if available
        try:
            payload = {"model": OLLAMA_MODEL, "prompt": prompt, "stream": False}
            resp = requests.post(OLLAMA_URL, json=payload)
            if resp.status_code == 200:
                result = resp.json()
                answer_text = result.get("response", "")
                if not answer_text:
                    raise RuntimeError("Empty response from LLM")
            else:
                raise RuntimeError(f"Ollama API error (status {resp.status_code})")
        except Exception as e:
            # If any error with Ollama, fallback to HuggingFace
            if hf_pipeline is None:
                hf_pipeline = pipeline("text2text-generation", model=HF_MODEL_NAME)
            result = hf_pipeline(prompt)
            if isinstance(result, list) and result:
                answer_text = result[0].get('generated_text', '')
            else:
                answer_text = str(result)
    else:
        # Use HuggingFace Transformers pipeline (local model) for explanation
        if hf_pipeline is None:
            hf_pipeline = pipeline("text2text-generation", model= HF_MODEL_NAME)
        result = hf_pipeline(prompt)
        if isinstance(result, list) and result:
            answer_text = result[0].get('generated_text', '')
        else:
            answer_text = str(result)
    return {"answer": answer_text}

@app.post("/shap-summary")
async def shap_summary(req: ShapRequest):
    model_name = req.model
    transform_name = req.transform
    input_data = req.data

    if model_name not in models or models[model_name] is None:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not available")

    # Parse and reshape input data
    try:
        arr = parse_input(data=input_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Input parsing error: {e}")
    if arr.size == 0:
        raise HTTPException(status_code=400, detail="No data provided for SHAP explanation")

    # Ensure correct shape (timesteps, 1)
    if arr.ndim != 2 or arr.shape[1] != 1:
        raise HTTPException(status_code=400, detail=f"Expected input shape (timesteps, 1), got {arr.shape}")

    # Adjust input length to match model requirement
    needed_len = None
    try:
        shape = models[model_name].input_shape
        if shape and len(shape) >= 3:
            needed_len = shape[1]
    except:
        pass
    if needed_len:
        if arr.shape[0] < needed_len:
            raise HTTPException(status_code=400, detail=f"Input too short, expected ≥ {needed_len}")
        elif arr.shape[0] > needed_len:
            arr = arr[-needed_len:]

    # Scale input
    if scaler:
        try:
            arr = scaler.transform(arr)
        except Exception as e:
            print(f"Scaler transform failed: {e}")

    # Apply transformation
    if transform_name and transform_name.lower() != "none":
        t = transform_name.lower()
        arr_series = arr.flatten()
        if t == 'dct':
            arr_trans = apply_dct(arr_series)
        elif t == 'dwt':
            arr_trans = apply_dwt(arr_series)
        elif t == 'cs':
            arr_trans = apply_cs(arr_series)
        else:
            arr_trans = arr_series
        arr = np.array(arr_trans, dtype=float).reshape(-1, 1)

    # Final input shape for SHAP
    arr_input = arr.reshape(1, arr.shape[0], 1).astype(np.float32)
    # Create background data of same shape
    L = arr_input.shape[1]
    features = arr_input.shape[2]
    background_data = np.random.normal(
        loc=np.mean(arr_input), 
        scale=np.std(arr_input) + 1e-6, 
        size=(50, L, features)
    ).astype(np.float32)

    try:
        model = models[model_name]
        explainer = shap.GradientExplainer(model, background_data)
        shap_result = explainer(arr_input)

        # Handle base value safely
        base_value = shap_result.base_values
        if base_value is None:
            base_value = 0.0
        elif isinstance(base_value, (list, np.ndarray)):
            base_value = float(np.array(base_value).flatten()[0])
        else:
            base_value = float(base_value)

        # SHAP values
        shap_vals = shap_result.values
        if isinstance(shap_vals, list):
            shap_vals = shap_vals[0]
        shap_flat = np.array(shap_vals).flatten()

        shap_dict = {f"Timestep t{i}": float(val) for i, val in enumerate(shap_flat)}
        importance_dict = {f"Timestep t{i}": float(abs(val)) for i, val in enumerate(shap_flat)}

        return {
            "base_value": base_value,
            "shap_values": shap_dict,
            "feature_importance": importance_dict
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"SHAP computation failed: {e}")

@app.get("/models")
async def list_models():
    """List available model names and transform options."""
    available_models = [name for name, mdl in models.items() if mdl is not None]
    transforms_list = ["DCT", "DWT", "CS"]
    return {"models": available_models, "transforms": transforms_list}

@app.get("/health")
async def health_check():
    """Health check endpoint providing memory usage and loaded models."""
    process = psutil.Process(os.getpid())
    mem_bytes = process.memory_info().rss
    mem_mb = mem_bytes / (1024 * 1024)
    loaded_models = [name for name, mdl in models.items() if mdl is not None]
    return {"memory_usage_mb": round(mem_mb, 2), "loaded_models": loaded_models}

# In-memory storage for feedback submissions
feedback_store = []

@app.post("/feedback")
async def submit_feedback(feedback: FeedbackRequest):
    """
    Endpoint to submit feedback about model accuracy or predictions.
    Stores feedback in memory (could be extended to a database or file).
    """
    fb_entry = feedback.dict()
    feedback_store.append(fb_entry)
    return {"status": "success", "message": "Feedback recorded", "feedback_id": len(feedback_store)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
