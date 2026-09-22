# Bioactive Molecule Prediction Using Extreme Gradient Boosting (XGBoost) 🧬💻

## 📌 Overview
In the early stages of drug discovery, identifying chemical compounds that exhibit biological activity against specific targets is a critical, resource-intensive challenge. This project leverages **Extreme Gradient Boosting (XGBoost)** to accurately classify chemical compounds as either bioactive (active) or inactive based purely on their molecular structure descriptors. 

By automating the identification of potentially active molecules, this machine learning approach aims to significantly accelerate early-stage drug discovery pipelines.

## 🎯 Problem Statement
**"Given the molecular structure of a compound, can a machine learning model predict whether it is biologically active?"**

This is framed as a **compound classification problem**:
* **Input:** Molecules represented using numerical descriptors or structural fingerprints.
* **Output:** Predicted biological activity class (Active vs. Inactive).

## 🛠️ Tech Stack & Tools
* **Programming & Environment:** Python, Google Colab
* **Data Manipulation & Analysis:** pandas, NumPy
* **Cheminformatics:** RDKit
* **Machine Learning:** scikit-learn, XGBoost
* **Data Visualization:** Matplotlib, Seaborn
* **Web App Deployment:** Streamlit
* **Datasets:** ChEMBL / DUD-E / COX2

## 📊 Methodology
1. **Data Acquisition:** Sourcing chemical compound data and their corresponding bioactivity values from ChEMBL, DUD-E, or COX2 datasets.
2. **Data Preprocessing & Feature Engineering:** Cleaning the dataset and utilizing **RDKit** to convert chemical structures (like SMILES strings) into numerical molecular descriptors and fingerprints.
3. **Exploratory Data Analysis (EDA):** Visualizing feature distributions, chemical space, and activity thresholds using **Matplotlib** and **Seaborn**.
4. **Model Training:** Training an **XGBoost** classifier to map the relationship between molecular fingerprints and bioactivity classes.
5. **Evaluation:** Assessing model performance using accuracy, precision, recall, and ROC-AUC scores.
6. **Deployment:** Building an interactive **Streamlit** web application where users can input chemical structures and receive real-time bioactivity predictions.

## 👨‍🏫 Acknowledgments
* **Mentor:** Dr. T. Swathi
* **Category:** Drug Discovery / Machine Learning
## 📊 System Architecture & Methodology

**Research Methodology & System Architecture Workflow:**
![Research Methodology](<Screenshot 2026-09-22 at 2.04.25 PM.jpg>)

**Core Data Splitting Workflow:**
![Data Splitting](<Screenshot 2026-09-22 at 10.15.58 PM.png>)