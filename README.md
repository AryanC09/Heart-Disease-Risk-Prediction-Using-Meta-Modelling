🫀 Meta-Model for Cardiovascular Risk Prediction
📌 Project Overview

This project builds a stacked meta-model for predicting cardiovascular disease risk by combining two independent Random Forest classifiers trained on:

UCI Heart Disease Dataset (RF-UCI)

Framingham Heart Study Dataset (RF-FRAM)

The outputs (probabilities) of these two models are then combined using a Meta-Model (Logistic Regression, Random Forest, or LightGBM).
This approach reduces error by leveraging the principle of error reduction from independent datasets.

⚙️ Workflow

Data Preparation

UCI Heart dataset → Features + Labels

Framingham dataset → Features + Labels

Preprocessing includes missing value handling, normalization, and categorical encoding.

Base Models

Train Random Forest on UCI dataset (RF-UCI).

Train Random Forest on Framingham dataset (RF-FRAM).

Evaluate with Cross-Validation for robust metrics.

Meta-Data Generation

For each sample, record:

Probability from RF-UCI (p_uci)

Probability from RF-FRAM (p_fram)

True label (y)

Store as a Meta-Dataset (meta_dataset.csv).

Meta-Model Training

Input: [p_uci, p_fram]

Output: y (true label)

Models tested: Logistic Regression, Random Forest, LightGBM

Deployment

User enters medical parameters via Flask web app with HTML/CSS form.

Both RF-UCI and RF-FRAM make predictions → probabilities.

Meta-model combines probabilities → final risk prediction.

📊 Theoretical Justification

UCI-RF Accuracy (CV): 93.3%, ROC-AUC: 0.9676

FRAM-RF Accuracy (CV): 85.0%, ROC-AUC: 0.7005

Error Reduction Principle:

UCI Error ≈ 6.6%

Framingham Error ≈ 15.0%

If independent:

𝑃
(
both fail
)
=
0.066
×
0.15
≈
0.0099
 
(
0.99
%
)
P(both fail)=0.066×0.15≈0.0099 (0.99%)

Meta-model accuracy ≈ 98–99% (theoretical upper bound).

🚀 Installation
git clone https://github.com/yourusername/meta-cardiovascular-risk.git
cd meta-cardiovascular-risk
pip install -r requirements.txt

📂 Project Structure
├── data/
│   ├── uci_heart.csv
│   ├── framingham.csv
├── models/
│   ├── rf_uci.pkl
│   ├── rf_fram.pkl
│   ├── meta_model.pkl
├── meta_dataset.csv
├── app.py              # Flask app
├── templates/
│   └── form.html       # HTML form
├── static/
│   └── style.css       # CSS styling
├── requirements.txt
└── README.md

🖥️ Usage

Run the Flask app:

python app.py


Open in browser:

http://127.0.0.1:5000/


Fill in patient details → Get Risk Probability and Final Prediction.

📈 Results

Meta-Model Accuracy: ~79.8% (empirical)

Meta-Model ROC-AUC: ~0.7357

Theoretical Accuracy: ~98–99% (error reduction principle)

🔮 Future Work

Improve meta-model with LightGBM/XGBoost

Use SHAP for feature explainability

Expand with additional datasets for robustness

Deploy as a full-stack web application

👨‍💻 Authored By - Aryan Chandel

Copyright (c) 2025 Aryan Chandel
