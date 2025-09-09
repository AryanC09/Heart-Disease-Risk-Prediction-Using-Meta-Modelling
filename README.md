# 🫀 Meta-Model for Cardiovascular Risk Prediction  

![Python](https://img.shields.io/badge/Python-3.9+-blue?logo=python)  
![ML](https://img.shields.io/badge/Machine%20Learning-Stacking%20Ensemble-green)  
![Flask](https://img.shields.io/badge/Flask-Web%20App-black?logo=flask)  
![Status](https://img.shields.io/badge/Status-Active-success)  
![Accuracy](https://img.shields.io/badge/UCI_RF-93.3%25-brightgreen)  
![Accuracy](https://img.shields.io/badge/Framingham_RF-85.0%25-yellow)  
![Meta-Model](https://img.shields.io/badge/Meta_Model-79.8%25-orange)  

---

## 📌 Overview
This project builds a **stacked meta-model** to predict cardiovascular disease risk by combining predictions from two independent Random Forest models trained on:  

- 📂 **UCI Heart Disease Dataset**  
- 📂 **Framingham Heart Study Dataset**  

The meta-model takes probabilities from both models and produces a **final prediction** using Logistic Regression / Random Forest / LightGBM.  
This improves accuracy via the **Principle of Error Reduction**.  

---

## ⚙️ Workflow

graph TD;
    A[UCI Dataset] --> B[RF-UCI Model];
    C[Framingham Dataset] --> D[RF-FRAM Model];
    B --> E[Meta-Dataset];
    D --> E[Meta-Dataset];
    E --> F[Meta-Model (LR / RF / LightGBM)];
    F --> G[Final Prediction];

## 📊 Results
| Model                | Accuracy (CV)                        | ROC-AUC |
| -------------------- | ------------------------------------ | ------- |
| **RF-UCI**           | 93.3%                                | 0.9676  |
| **RF-FRAM**          | 85.0%                                | 0.7005  |
| **Meta-Model**       | \~79.8% (empirical)                  | 0.7357  |
| **Meta-Theoretical** | \~98–99% (error reduction principle) | —       |

## 🧮 Error Reduction Formula:
P(both fail)=euci​×efram​≈0.066×0.15≈0.0099 (0.99%)

## 📂 Project Structure

├── data/
│   ├── uci_heart.csv
│   ├── framingham.csv
├── models/
│   ├── rf_uci.pkl
│   ├── rf_fram.pkl
│   ├── meta_model.pkl
├── meta_dataset.csv
├── app.py              
├── templates/
│   └── form.html       
├── static/
│   └── style.css       
├── requirements.txt
└── README.md

## 🚀 Installation
git clone https://github.com/yourusername/meta-cardiovascular-risk.git
cd meta-cardiovascular-risk
pip install -r requirements.txt

## 🖥️ Usage

Run the Flask app:
python app.py

Open in browser:

http://127.0.0.1:5000/
Enter patient details → Get risk probability + final prediction.

## 🔮 Future Enhancements
    - Try LightGBM / XGBoost for meta-model
    - Add SHAP-based explainability
    - Deploy full-stack with Docker + Cloud
    - Extend with more clinical datasets

## 📸 Screenshots

(Add screenshots of UI and predictions here in Markdown format, e.g.):

![Form UI](screenshots/form_ui.png)  
![Prediction Result](screenshots/result.png)

## 👨‍💻 Authors
Aryan Chandel – Project Lead 😉

Copyright (c) 2025 Aryan Chandel

