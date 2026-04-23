def check_compliance(metrics: dict) -> dict:
    violations = []
    
    di = metrics.get("disparate_impact_ratio", 1.0)
    if di < 0.8:
        violations.append("EEOC 4/5ths threshold breached")
        
    dpd = metrics.get("demographic_parity_difference", 0.0)
    if dpd > 0.1:
        violations.append("Potential EU AI Act fairness concern")
        
    eod = metrics.get("equalized_odds_difference", 0.0)
    if eod > 0.1:
        violations.append("High Equalized Odds difference - risk of disparate mistreatment")
        
    return {
        "violations": violations
    }
