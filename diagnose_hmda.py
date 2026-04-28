"""
HMDA Dataset Deep Diagnosis — Why DI=1.0?
==========================================
"""
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_predict
from sklearn.preprocessing import LabelEncoder

HMDA = "backend/app/data/demo_datasets/hmda_demo.csv"
ADULT = "backend/app/data/demo_datasets/adult_demo.csv"

df = pd.read_csv(HMDA)
print(f"HMDA shape: {df.shape}")
print(f"Columns: {list(df.columns)}\n")

# ================================================================
# 1. DATA DISTRIBUTION CHECK
# ================================================================
print("=" * 60)
print("  1. TARGET DISTRIBUTION")
print("=" * 60)

# What does audit_engine use as y_true?
TARGET_CANDIDATES = ["y_true", "outcome", "label", "target", "income_binary", "two_year_recid", "action_taken"]
target_col = None
for c in TARGET_CANDIDATES:
    if c in df.columns:
        target_col = c
        break
print(f"  Target column resolved: {target_col}")
if target_col:
    print(f"\n  Value counts (raw):")
    print(df[target_col].value_counts().to_string().replace("\n", "\n  "))
    print(f"\n  Value counts (normalized):")
    print(df[target_col].value_counts(normalize=True).to_string().replace("\n", "\n  "))
    
    # Check how audit_engine binarizes this
    vals = set(df[target_col].dropna().unique())
    print(f"\n  Unique values: {vals}")
    if vals <= {0, 1}:
        print("  Binarization: already {0,1}")
        y_true = df[target_col]
    elif vals <= {-1, 1}:
        print("  Binarization: {-1,1} -> map -1->0")
        y_true = df[target_col].map({-1: 0, 1: 1})
    elif vals <= {1, 2}:
        print("  Binarization: {1,2} -> map 1->1, 2->0")
        y_true = df[target_col].map({1: 1, 2: 0})
    else:
        median = df[target_col].median()
        print(f"  Binarization: median split at {median}")
        y_true = (df[target_col] >= median).astype(int)
    
    print(f"\n  After binarization:")
    print(f"  {y_true.value_counts().to_string()}")
    print(f"  Positive rate: {y_true.mean():.4f}")

# ================================================================
# 2. GROUP OUTCOME ANALYSIS
# ================================================================
print("\n" + "=" * 60)
print("  2. GROUP OUTCOME ANALYSIS")
print("=" * 60)

# What does attribute_detector pick?
from app.modules.attribute_detector import detect_attributes
protected = detect_attributes(df)
print(f"  Detected protected: {protected}")

# What does audit_engine pick as primary?
PREFERRED = ["sex", "gender", "race", "ethnicity"]
scored = []
for col in protected:
    nunique = df[col].nunique()
    is_preferred = any(p in col.lower() for p in PREFERRED)
    is_categorical = df[col].dtype == object
    score = (
        0 if is_preferred else 1,
        0 if is_categorical else 1,
        0 if 2 <= nunique <= 10 else 1,
        nunique,
    )
    scored.append((score, col))
scored.sort()
primary = scored[0][1] if scored else None
print(f"  Primary protected (audit_engine picks): {primary}")
print(f"  Primary nunique: {df[primary].nunique() if primary else '?'}")
if primary:
    print(f"  Primary value counts:")
    print(f"  {df[primary].value_counts().head(10).to_string()}")

# Group outcome rates
if primary and target_col:
    print(f"\n  Outcome rates by {primary}:")
    group_rates = df.groupby(primary)[target_col].mean()
    print(f"  {group_rates.to_string()}")
    
    print(f"\n  After binarization, rates by {primary}:")
    df_temp = df.copy()
    df_temp["_y_bin"] = y_true
    group_rates_bin = df_temp.groupby(primary)["_y_bin"].mean()
    print(f"  {group_rates_bin.to_string()}")

# ================================================================
# 3. FEATURE LEAKAGE CHECK
# ================================================================
print("\n" + "=" * 60)
print("  3. FEATURE LEAKAGE CHECK")
print("=" * 60)

numeric = df.select_dtypes(include=[np.number])
if target_col in numeric.columns:
    corrs = numeric.corr()[target_col].drop(target_col).abs().sort_values(ascending=False)
    print(f"  Top correlations with {target_col}:")
    for feat, val in corrs.head(10).items():
        flag = " *** LEAKAGE ***" if val > 0.95 else (" ** HIGH **" if val > 0.7 else "")
        print(f"    {feat}: {val:.4f}{flag}")

# ================================================================
# 4. MODEL BEHAVIOR CHECK
# ================================================================
print("\n" + "=" * 60)
print("  4. MODEL BEHAVIOR — what cross_val_predict produces")
print("=" * 60)

if target_col:
    # Replicate exact audit_engine logic
    df_work = df.copy()
    for col in df_work.columns:
        if col == target_col:
            continue
        if df_work[col].dtype == object or str(df_work[col].dtype).startswith("string"):
            df_work[col] = LabelEncoder().fit_transform(df_work[col].astype(str))
    
    numeric_work = df_work.select_dtypes(include=["number"]).dropna()
    y = numeric_work[target_col].astype(int)
    X = numeric_work.drop(columns=[target_col])
    
    print(f"  X shape: {X.shape}")
    print(f"  y unique: {y.unique()}")
    print(f"  y distribution: {y.value_counts().to_dict()}")
    
    model = LogisticRegression(max_iter=1000, solver="lbfgs", random_state=42)
    y_pred = pd.Series(cross_val_predict(model, X, y, cv=5), index=X.index)
    
    accuracy = (y_pred == y).mean()
    print(f"\n  Cross-val accuracy: {accuracy:.4f}")
    print(f"  y_pred distribution: {y_pred.value_counts().to_dict()}")
    
    # Binarize predictions
    y_bin = y_true.loc[X.index]
    y_pred_bin = y_pred.copy()
    vals_pred = set(y_pred.unique())
    if vals_pred <= {0, 1}:
        pass
    elif vals_pred <= {1, 2}:
        y_pred_bin = y_pred.map({1: 1, 2: 0})
    
    print(f"\n  y_pred after binarization: {y_pred_bin.value_counts().to_dict()}")
    
    # Check: are predictions constant?
    if y_pred_bin.nunique() == 1:
        print(f"\n  *** CRITICAL: y_pred is CONSTANT ({y_pred_bin.unique()[0]}) ***")
        print(f"  *** This means selection rate is IDENTICAL for all groups ***")
        print(f"  *** DI = 1.0 because all groups get same prediction ***")
    
    # Selection rates per group
    if primary:
        sensitive = df.loc[X.index, primary].fillna("Unknown").astype(str)
        print(f"\n  Selection rate per {primary} group:")
        for g in sensitive.unique():
            mask = sensitive == g
            sr = y_pred_bin[mask].mean()
            n = mask.sum()
            print(f"    {g}: {sr:.4f} (n={n})")
        
        rates = [float(y_pred_bin[sensitive == g].mean()) for g in sensitive.unique()]
        if max(rates) > 0:
            di_manual = min(rates) / max(rates)
        else:
            di_manual = 1.0
        print(f"\n  Manual DI: {di_manual:.6f}")

# ================================================================
# 5. COMPARE WITH ADULT (WORKING DATASET)
# ================================================================
print("\n" + "=" * 60)
print("  8. COMPARISON WITH ADULT (working dataset)")
print("=" * 60)

df_adult = pd.read_csv(ADULT)
adult_target = "income_binary"
adult_prot = "race_group"

print(f"  ADULT target distribution:")
print(f"  {df_adult[adult_target].value_counts().to_dict()}")
print(f"  Positive rate: {df_adult[adult_target].mean():.4f}")

print(f"\n  ADULT group rates:")
print(f"  {df_adult.groupby(adult_prot)[adult_target].mean().to_string()}")

# Model check
df_a = df_adult.copy()
for col in df_a.columns:
    if col == adult_target:
        continue
    if df_a[col].dtype == object:
        df_a[col] = LabelEncoder().fit_transform(df_a[col].astype(str))
num_a = df_a.select_dtypes(include=["number"]).dropna()
ya = num_a[adult_target].astype(int)
Xa = num_a.drop(columns=[adult_target])
model_a = LogisticRegression(max_iter=1000, solver="lbfgs", random_state=42)
yp_a = cross_val_predict(model_a, Xa, ya, cv=5)
acc_a = (yp_a == ya).mean()
print(f"\n  ADULT cross-val accuracy: {acc_a:.4f}")
print(f"  ADULT y_pred unique: {np.unique(yp_a)}")
print(f"  ADULT y_pred distribution: {dict(zip(*np.unique(yp_a, return_counts=True)))}")

print("\n" + "=" * 60)
print("  DIAGNOSIS COMPLETE")
print("=" * 60)
