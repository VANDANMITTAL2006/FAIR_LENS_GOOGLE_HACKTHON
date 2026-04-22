KNOWN_PROTECTED = [
    "gender",
    "sex",
    "race",
    "age",
    "ethnicity",
    "zipcode",
    "zip_code",
    "nationality",
    "marital_status"
]


def detect_attributes(df):
    matches = []
    for col in df.columns:
        if col.lower() in KNOWN_PROTECTED:
            matches.append(col)
    return matches
