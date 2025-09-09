# app.py
import os
from flask import Flask, render_template, request, jsonify
import joblib
import pandas as pd
import numpy as np

# Optional: health tips mapping. If you placed health_tips.py use it; otherwise fallback dict used below.
try:
    from health_tips import HEALTH_TIPS
except Exception:
    HEALTH_TIPS = {
        "default": "Maintain a balanced diet, regular exercise, avoid smoking, and get routine health checks."
    }

# ----------------------------
# Config / Paths
# ----------------------------
APP_ROOT = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(APP_ROOT, "model")

UCI_MODEL_PATH = os.path.join(MODEL_DIR, "model_uci.pkl")   # <-- ensure your file name matches
FRAM_MODEL_PATH = os.path.join(MODEL_DIR, "model_fram.pkl") # <-- ensure your file name matches
META_MODEL_PATH = os.path.join(MODEL_DIR, "meta_model.pkl")

WHO_LINK = "https://www.who.int/news-room/fact-sheets/detail/cardiovascular-diseases-(cvds)"

# ----------------------------
# Flask app
# ----------------------------
app = Flask(__name__, static_folder="static", template_folder="templates")

# ----------------------------
# Load models (must exist)
# ----------------------------
if not os.path.exists(UCI_MODEL_PATH):
    raise FileNotFoundError(f"UCI model not found at {UCI_MODEL_PATH}")
if not os.path.exists(FRAM_MODEL_PATH):
    raise FileNotFoundError(f"Framingham model not found at {FRAM_MODEL_PATH}")
if not os.path.exists(META_MODEL_PATH):
    raise FileNotFoundError(f"Meta-model not found at {META_MODEL_PATH}")

rf_uci = joblib.load(UCI_MODEL_PATH)
rf_fram = joblib.load(FRAM_MODEL_PATH)
meta_model = joblib.load(META_MODEL_PATH)

# Feature lists as stored in the models (preserve training order)
uci_features = [str(x) for x in rf_uci.feature_names_in_]
fram_features = [str(x) for x in rf_fram.feature_names_in_]

# ----------------------------
# Form name ↔ model column mappings
# (map the HTML form 'name' attributes to model column names)
# ----------------------------
FORM_TO_MODEL = {
    # UCI model inputs (form_name -> model_col_name)
    "age": "age",
    "sex": "sex",  # UCI uses 'sex'
    "chestPainType": "chest pain type",
    "restingBpS": "resting bp s",
    "cholesterol": "cholesterol",
    "fastingBloodSugar": "fasting blood sugar",
    "restingEcg": "resting ecg",
    "maxHeartRate": "max heart rate",
    "exerciseAngina": "exercise angina",
    "oldpeak": "oldpeak",
    "stSlope": "ST slope",

    # Framingham form -> model column
    "education": "education",
    "currentSmoker": "currentSmoker",
    "cigsPerDay": "cigsPerDay",
    "BPMeds": "BPMeds",
    "prevalentStroke": "prevalentStroke",
    "prevalentHyp": "prevalentHyp",
    "diabetes": "diabetes",
    "totChol": "totChol",
    "sysBP": "sysBP",
    "diaBP": "diaBP",
    "BMI": "BMI",
    "heartRate": "heartRate",
    "totChol": "totChol",
    # NOTE: framingham model had 'glucose' in training; your form may not include it.
    # If your form doesn't include glucose, it will be filled with 0 by reindexing.
}

# Inverse mapping model col -> form name (for looking up values)
MODEL_TO_FORM = {v: k for k, v in FORM_TO_MODEL.items()}
# Special-case: mapping 'male' model column to form 'sex'
MODEL_TO_FORM.setdefault("male", "sex")

# The complete list of form field names we expect from index.html
EXPECTED_FORM_FIELDS = [
    "age", "sex", "education", "currentSmoker", "cigsPerDay", "BPMeds",
    "prevalentStroke", "prevalentHyp", "diabetes", "BMI", "heartRate",
    "sysBP", "diaBP", "restingBpS", "maxHeartRate", "chestPainType",
    "cholesterol", "totChol", "fastingBloodSugar", "restingEcg",
    "exerciseAngina", "oldpeak", "stSlope"
]

# ----------------------------
# Helpers
# ----------------------------
def to_number(v):
    """Convert form string to int/float where possible, else return 0 for empty."""
    if v is None:
        return 0
    if isinstance(v, (int, float)):
        return v
    s = str(v).strip()
    if s == "":
        return 0
    # boolean-like
    if s.lower() in ("true", "yes", "y"):
        return 1
    if s.lower() in ("false", "no", "n"):
        return 0
    try:
        if "." in s:
            return float(s)
        return int(s)
    except:
        # fallback: try float
        try:
            return float(s)
        except:
            return 0

def build_user_inputs(form):
    """Collect all expected form fields and convert to numeric values."""
    data = {}
    for f in EXPECTED_FORM_FIELDS:
        data[f] = to_number(form.get(f))
    return data

def build_model_dfs(user_inputs):
    """
    Build two DataFrames (1 row) for UCI and Framingham models in the exact
    column order the models expect. Missing columns are filled with 0.
    """
    # Prepare dictionaries keyed by model column names
    uci_input = {}
    for col in uci_features:
        # find corresponding form key
        form_key = MODEL_TO_FORM.get(col, None)
        if form_key:
            uci_input[col] = user_inputs.get(form_key, 0)
        else:
            # sometimes form key is exactly same
            uci_input[col] = user_inputs.get(col, 0)

    fram_input = {}
    for col in fram_features:
        # model column 'male' maps to form 'sex'
        if col == "male":
            fram_input[col] = user_inputs.get("sex", 0)
            continue
        form_key = MODEL_TO_FORM.get(col, None)
        if form_key:
            fram_input[col] = user_inputs.get(form_key, 0)
        else:
            fram_input[col] = user_inputs.get(col, 0)

    uci_df = pd.DataFrame([uci_input])
    fram_df = pd.DataFrame([fram_input])
    # Ensure column order matches training models; fill missing columns with 0
    uci_df = uci_df.reindex(columns=uci_features, fill_value=0)
    fram_df = fram_df.reindex(columns=fram_features, fill_value=0)
    return uci_df, fram_df

def get_probabilities(uci_df, fram_df):
    """Return uci_prob, fram_prob as floats (0..1)."""
    uci_prob = float(rf_uci.predict_proba(uci_df)[0][1])
    fram_prob = float(rf_fram.predict_proba(fram_df)[0][1])
    return uci_prob, fram_prob

def risk_category(prob):
    if prob < 0.4:
        return "Low Risk"
    elif prob <= 0.6:
        return "Moderate Risk"
    else:
        return "High Risk"

def combine_feature_importances(top_n=10):
    """
    Create a combined ranking of features using RF feature_importances_ from both models.
    Returns top_n model feature names (strings), in descending combined importance.
    """
    # Get importances mapping
    imp_uci = dict(zip(uci_features, rf_uci.feature_importances_))
    imp_fram = dict(zip(fram_features, rf_fram.feature_importances_))
    # Combine by simple addition (features unique to one model still included)
    combined = {}
    for k, v in imp_uci.items():
        combined[k] = combined.get(k, 0.0) + float(v)
    for k, v in imp_fram.items():
        combined[k] = combined.get(k, 0.0) + float(v)
    # Sort descending
    sorted_feats = sorted(combined.items(), key=lambda x: x[1], reverse=True)
    top_feats = [f for f, _ in sorted_feats[:top_n]]
    return top_feats

def get_value_for_feature_name(feature_name, user_inputs):
    """
    Given a model-style feature name (e.g., 'resting bp s' or 'male'), try to
    extract the numeric value from user_inputs (which are keyed by form names).
    """
    # direct: if feature_name maps to a form field
    form_key = MODEL_TO_FORM.get(feature_name)
    if form_key and form_key in user_inputs:
        return user_inputs.get(form_key)
    # special-case male -> sex
    if feature_name == "male" and "sex" in user_inputs:
        return user_inputs.get("sex")
    # try normalized match: remove spaces and case
    normalized = feature_name.replace(" ", "").lower()
    for k, v in user_inputs.items():
        if k.replace(" ", "").lower() == normalized:
            return v
    # fallback 0
    return 0

def get_dynamic_tips(features_list):
    """Return list of dicts: {"feature": name, "tip": text} using HEALTH_TIPS fallback to default."""
    tips_out = []
    for f in features_list:
        # try multiple keys in HEALTH_TIPS
        tip = HEALTH_TIPS.get(f) or HEALTH_TIPS.get(f.lower()) or HEALTH_TIPS.get(MODEL_TO_FORM.get(f, ""), None) or HEALTH_TIPS.get("default")
        tips_out.append({"feature": f, "tip": tip})
    return tips_out

# ----------------------------
# Routes
# ----------------------------
@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():
    """
    Handles standard form POST (from index.html) and returns result.html rendering.
    For the slider updates (if you implement AJAX later), we kept this route simple:
    it can also accept JSON with 'base_inputs' and 'modified' keys (optional).
    """
    # If JSON (AJAX from sliders), merge base_inputs + modified (modified takes precedence)
    if request.is_json:
        payload = request.get_json()
        base_inputs = payload.get("base_inputs", {})
        modified = payload.get("modified", {})
        # Convert all values to numeric and merge
        merged = {}
        # base
        for k, v in base_inputs.items():
            merged[k] = to_number(v)
        # modified (these might be model-column keys or form keys)
        for k, v in modified.items():
            # if modified key is a model column name and maps to a form key, set the form key
            if k in MODEL_TO_FORM:
                merged[MODEL_TO_FORM[k]] = to_number(v)
            else:
                # otherwise set directly — build_model_dfs can fallback on model column names
                merged[k] = to_number(v)
        user_inputs = merged
    else:
        # Standard form POST
        user_inputs = build_user_inputs(request.form)

    # Build model dataframes for each RF model
    uci_df, fram_df = build_model_dfs(user_inputs)

    # Compute probabilities
    uci_prob, fram_prob = get_probabilities(uci_df, fram_df)

    # Meta-model final probability (meta expects columns p_uci, p_fram)
    meta_df = pd.DataFrame([[uci_prob, fram_prob]], columns=["p_uci", "p_fram"])
    try:
        final_prob = float(meta_model.predict_proba(meta_df)[0][1])
    except Exception:
        # if meta_model lacks predict_proba fallback to predict (0/1)
        final_prob = float(meta_model.predict(meta_df)[0])

    final_cat = risk_category(final_prob)

    # Determine top 10 features by RF importances (no SHAP)
    top_features = combine_feature_importances(top_n=10)

    # For each top feature, get value (from user_inputs) to prefill sliders
    top_features_with_values = []
    for feat in top_features:
        val = get_value_for_feature_name(feat, user_inputs)
        top_features_with_values.append({"name": feat, "value": val})

    # Generate dynamic tips for the top features
    tips = get_dynamic_tips(top_features)

    # Prepare context for template
    context = {
        "final_prob": round(final_prob, 4),
        "final_cat": final_cat,
        "top_features": top_features,                     # list of strings (model-style names)
        "top_features_values": top_features_with_values,  # list of dicts for initial slider values
        "base_inputs": user_inputs,                       # keys are form field names (to fill other defaults)
        "tips": tips,
        "who_link": WHO_LINK
    }

    # If JSON request (slider update), return JSON so result page can update dynamically
    if request.is_json:
        return jsonify({
            "uci_prob": round(uci_prob, 4),
            "fram_prob": round(fram_prob, 4),
            "final_prob": round(final_prob, 4),
            "final_cat": final_cat,
            "top_features": top_features,
            "tips": tips
        })

    # Render result page
    return render_template("result.html", **context)

# ----------------------------
# Run
# ----------------------------
if __name__ == "__main__":
    # For local testing
    app.run(debug=True, host="0.0.0.0", port=5000)