def run_counterfactual(sample: dict) -> dict:
    """
    Simulates counterfactual discrimination (e.g., name/group swap).
    Deterministic fallback for instant response in demo.
    """
    base_score = 50
    
    # Add weight for positive attributes
    if int(sample.get("experience", 0)) > 3: 
        base_score += 15
    if str(sample.get("education", "")).lower() in ["mit", "stanford", "harvard"]: 
        base_score += 10
        
    # Simulate a biased model that penalizes Female and Asian
    gender_val = str(sample.get("gender", "")).lower()
    race_val = str(sample.get("race", "")).lower()
    
    bias_gender = -15 if gender_val == "female" else 0
    bias_race = -10 if race_val == "asian" else 0
    
    original_score = base_score + bias_gender + bias_race
    
    # Swap to privileged groups
    after_gender_swap = base_score + bias_race   # Removed gender bias
    after_race_swap = base_score + bias_gender   # Removed race bias
    
    delta = max(after_gender_swap, after_race_swap) - original_score
    delta_str = f"+{delta}" if delta > 0 else str(delta)
    
    return {
        "original_score": max(0, min(100, original_score)),
        "after_gender_swap": max(0, min(100, after_gender_swap)),
        "after_race_swap": max(0, min(100, after_race_swap)),
        "delta": delta_str
    }


def get_counterfactual(df) -> dict:
    if hasattr(df, "iloc") and len(df) > 0:
        sample = df.iloc[0].to_dict()
    else:
        sample = {}
    return run_counterfactual(sample)
