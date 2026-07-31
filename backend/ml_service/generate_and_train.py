import pandas as pd
import numpy as np
import xgboost as xgb
import lightgbm as lgb
import os

print("Memulai proses Generate Data Sintetis...")
# Generate 1000 baris data dummy
np.random.seed(42)
n_samples = 1000

# Fitur-fitur
distance_km = np.random.uniform(0.5, 50.0, n_samples)
stock_available = np.random.uniform(1.0, 50.0, n_samples)
qty_requested = np.random.uniform(1.0, 15.0, n_samples)

stock_ratio = stock_available / qty_requested
remaining_stock = stock_available - qty_requested

# Logika simulasi target (1=Sukses, 0=Gagal) -> Lebih rasional dan halus
# 1. Komponen Jarak (Maks 30 poin, semakin jauh makin kecil)
score_dist = np.clip(30 - (distance_km * 1.5), 0, 30)

# 2. Komponen Stok Rasio (Maks 30 poin, rasio besar = bagus)
score_ratio = np.clip(stock_ratio * 10, 0, 30)

# 3. Komponen Sisa Stok (Safety Net) -> Pengganti is_critical yang kejam
# Jika setelah diambil sisa stok di bawah 3, nilainya turun perlahan sampai negatif.
# Jika sisa stok berlimpah, beri bonus tambahan.
score_stock = np.clip((remaining_stock - 5) * 4, -40, 40)

# Total Keseluruhan (Target 0 - 100)
score = score_dist + score_ratio + score_stock
# Ubah score menjadi probabilitas (Sigmoid halus)
prob = 1 / (1 + np.exp(- (score - 40) / 10))

# Generate target 0/1 berdasarkan probabilitas
target = np.random.binomial(1, prob)

df = pd.DataFrame({
    'distance_km': distance_km,
    'stock_ratio': stock_ratio,
    'remaining_stock': remaining_stock,
    'target': target
})

X = df[['distance_km', 'stock_ratio', 'remaining_stock']]
y = df['target']

print("Melatih Model XGBoost...")
model_xgb = xgb.XGBClassifier(n_estimators=100, max_depth=3, learning_rate=0.1, random_state=42)
model_xgb.fit(X, y)
model_xgb.save_model('model_xgb.json')
print("Model XGBoost berhasil disimpan ke model_xgb.json")

print("Melatih Model LightGBM...")
model_lgb = lgb.LGBMClassifier(n_estimators=100, max_depth=3, learning_rate=0.1, random_state=42)
model_lgb.fit(X, y)
model_lgb.booster_.save_model('model_lgb.txt')
print("Model LightGBM berhasil disimpan ke model_lgb.txt")

print("Selesai! Kedua Otak AI siap digunakan.")
