import pandas as pd
import numpy as np

def explain(df: pd.DataFrame) -> dict:
    """
    Returns top features and their impact.
    Uses an absolute correlation proxy for speed (< 1 sec) on sample data.
    """
    # Use max 1000 rows to guarantee fast execution (< 10s)
    sample_df = df.sample(min(len(df), 1000), random_state=42) if len(df) > 1000 else df
    
    from app.modules.attribute_detector import detect_attributes
    protected = detect_attributes(sample_df)
    
    numeric_df = sample_df.select_dtypes(include=[np.number])
    target_col = "prediction" if "prediction" in numeric_df.columns else (
        numeric_df.columns[-1] if not numeric_df.empty else None
    )
    
    top_features = []
    
    if target_col and len(numeric_df.columns) > 1:
        try:
            # Proxy: absolute correlation with target
            corrs = numeric_df.corr()[target_col].drop(target_col).abs().fillna(0)
            sorted_corrs = corrs.sort_values(ascending=False).head(5)
            
            for feat, val in sorted_corrs.items():
                if feat not in protected:
                    top_features.append({
                        "feature": feat, 
                        "impact": round(float(val), 2)
                    })
        except Exception:
            pass
            
    if not top_features:
        return {
            "top_features": [],
            "group_difference_summary": "Cannot compute feature impacts from available numeric prediction signals.",
            "status": "cannot_compute",
        }

    return {
        "top_features": top_features,
        "group_difference_summary": "Feature impacts were computed from observed correlations in the uploaded dataset.",
        "status": "ok",
    }
