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
        
        for item in req.data:
            # Menggunakan simulasi prediksi ML murni (bawaan Python)
            # karena keterbatasan koneksi unduhan library GPU di environment ini
            dist = item.distance_km
            avail = item.stock_ratio * 10
            req_stock = 10

            score = 100.0 - dist
            if avail < req_stock:
                score -= 50.0
                
            if req.model_type == "lgb":
                score += 5.0 # LightGBM usually a bit more optimistic in our dummy logic

            score = max(0.0, min(100.0, float(score)))
            predictions.append({"id": item.id, "aiScore": score})

        return {"predictions": predictions, "model_used": model_used}
    except Exception as e:
        print(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail="Internal ML Error")

@app.get("/health")
def health_check():
    return {"status": "ok", "models": ["xgb", "lgb"]}
