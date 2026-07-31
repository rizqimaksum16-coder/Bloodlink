from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import List, Optional
import xgboost as xgb
import lightgbm as lgb
import pandas as pd
import os

app = FastAPI(title="Bloodlink ML Microservice")

# Token Rahasia untuk mengamankan API ini (Inter-service Security)
# Di dunia nyata, ini sebaiknya dipasang di environment variable (.env)
INTERNAL_API_KEY = os.getenv("ML_INTERNAL_API_KEY", "BL00DL1NK_S3CR3T_K3Y_9982")

# Load Models
try:
    xgb_model = xgb.XGBClassifier()
    xgb_model.load_model('model_xgb.json')
    print("XGBoost model loaded.")
except Exception as e:
    print(f"Failed to load XGBoost model: {e}")
    xgb_model = None

try:
    lgb_model = lgb.Booster(model_file='model_lgb.txt')
    print("LightGBM model loaded.")
except Exception as e:
    print(f"Failed to load LightGBM model: {e}")
    lgb_model = None

class PMIRequest(BaseModel):
    id: str
    distance_km: float
    stock_ratio: float
    remaining_stock: float

class PredictionRequest(BaseModel):
    model_type: Optional[str] = "xgboost" # Bisa 'xgboost' atau 'lightgbm'
    data: List[PMIRequest]

def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized. Invalid Internal API Key.")
    return x_api_key

@app.post("/predict")
def predict_success(request: PredictionRequest, api_key: str = Depends(verify_api_key)):
    if not request.data:
        return {"predictions": []}

    df = pd.DataFrame([item.dict() for item in request.data])
    features = df[['distance_km', 'stock_ratio', 'remaining_stock']]
    
    predictions = []
    if request.model_type.lower() == 'lightgbm':
        if lgb_model is None:
            raise HTTPException(status_code=500, detail="LightGBM model not loaded")
        # LightGBM predict returns probabilities directly for positive class
        probs = lgb_model.predict(features)
    else:
        if xgb_model is None:
            raise HTTPException(status_code=500, detail="XGBoost model not loaded")
        # XGBoost predict_proba returns [prob_0, prob_1]
        probs = xgb_model.predict_proba(features)[:, 1]

    # Gabungkan kembali dengan ID
    for i, pmi_id in enumerate(df['id']):
        # AI Score skala 0 - 100
        ai_score = round(float(probs[i]) * 100)
        predictions.append({
            "id": pmi_id,
            "aiScore": ai_score
        })
    
    # Urutkan berdasarkan aiScore tertinggi
    predictions.sort(key=lambda x: x['aiScore'], reverse=True)
    
    return {"predictions": predictions, "model_used": request.model_type}

@app.get("/health")
def health_check():
    return {"status": "healthy", "xgb_loaded": xgb_model is not None, "lgb_loaded": lgb_model is not None}
