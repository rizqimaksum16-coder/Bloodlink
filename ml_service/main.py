from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import List, Optional
import os

app = FastAPI(title="Bloodlink ML Service")

# Secure Internal API Key
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "bloodlink-super-secret-key-2026")

async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Akses Ditolak: API Key tidak valid")
    return x_api_key

class PredictionData(BaseModel):
    id: str
    distance_km: float
    stock_ratio: float
    remaining_stock: Optional[float] = 0.0
    is_critical: Optional[int] = 0

class PredictionRequest(BaseModel):
    model_type: Optional[str] = "xgb" # "xgb" or "lgb"
    data: List[PredictionData]

class PredictionResponse(BaseModel):
    predictions: List[dict]
    model_used: str

@app.post("/predict", response_model=PredictionResponse)
def predict_score(req: PredictionRequest, api_key: str = Depends(verify_api_key)):
    try:
        predictions = []
        model_used = "XGBoost" if req.model_type != "lgb" else "LightGBM"

        # Cek apakah file model hasil training tersedia
        xgb_path = os.path.join(os.path.dirname(__file__), "model_xgb.json")
        lgb_path = os.path.join(os.path.dirname(__file__), "model_lgb.txt")
        
        real_model = None
        if req.model_type != "lgb" and os.path.exists(xgb_path):
            try:
                import xgboost as xgb
                real_model = xgb.XGBRegressor()
                real_model.load_model(xgb_path)
                model_used = "XGBoost (Trained Model)"
            except Exception as e:
                print("Failed to load XGBoost model, falling back to formula:", e)

        for item in req.data:
            dist = item.distance_km
            avail = item.stock_ratio * 10
            req_stock = 10

            if real_model is not None:
                import numpy as np
                features = np.array([[dist, avail, req_stock]])
                pred = real_model.predict(features)[0]
                score = float(pred)
            else:
                score = 100.0 - dist
                if avail < req_stock:
                    score -= 50.0
                if req.model_type == "lgb":
                    score += 5.0

            score = max(0.0, min(100.0, float(score)))
            predictions.append({"id": item.id, "aiScore": score})

        return {"predictions": predictions, "model_used": model_used}
    except Exception as e:
        print(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail="Internal ML Error")

@app.get("/health")
def health_check():
    return {"status": "ok", "models": ["xgb", "lgb"]}
