import json
import numpy as np
import pandas as pd
import xgboost as xgb
import lightgbm as lgb
from sklearn.model_selection import train_test_split

print("Membuat data dummy untuk Bloodlink AI...")
# Dummy data: 1000 records
# Features: distance_km, available_stock, required_stock
# Target: score (0-100)

np.random.seed(42)
n_samples = 1000

distance_km = np.random.uniform(0.5, 30.0, n_samples)
available_stock = np.random.randint(0, 100, n_samples)
required_stock = np.random.randint(1, 10, n_samples)

# Rule-based score generator for dummy target
# Formula: Base 100
# - distance: -1 per km
# - stock penalty: -50 if available_stock < required_stock
# + some noise
scores = []
for dist, avail, req in zip(distance_km, available_stock, required_stock):
    score = 100.0 - dist
    if avail < req:
        score -= 50.0
    # Add noise
    score += np.random.normal(0, 2)
    # Clip
    score = max(0, min(100, score))
    scores.append(score)

df = pd.DataFrame({
    'distance_km': distance_km,
    'available_stock': available_stock,
    'required_stock': required_stock,
    'score': scores
})

X = df[['distance_km', 'available_stock', 'required_stock']]
y = df['score']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("Melatih XGBoost...")
xgb_model = xgb.XGBRegressor(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42)
xgb_model.fit(X_train, y_train)
xgb_model.save_model('model_xgb.json')
print("Model XGBoost berhasil disimpan (model_xgb.json).")

print("Melatih LightGBM...")
lgb_model = lgb.LGBMRegressor(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42)
lgb_model.fit(X_train, y_train)
lgb_model.booster_.save_model('model_lgb.txt')
print("Model LightGBM berhasil disimpan (model_lgb.txt).")

print("Selesai! Kedua model siap digunakan oleh FastAPI.")
