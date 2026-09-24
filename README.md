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

## 🗄️ Datasets Used
High-quality chemical data is essential for training an accurate bioactivity classifier. This project utilizes established cheminformatics databases to source molecular structures and their biological activity labels:

* **[ChEMBL](https://www.ebi.ac.uk/chembl/):** A manually curated database of bioactive molecules with drug-like properties. We use ChEMBL to extract chemical structures (SMILES strings) and their experimental binding affinities (such as IC50 values) to determine baseline active/inactive thresholds.
* **[DUD-E](http://dude.docking.org/) (Directory of Useful Decoys, Enhanced):** A crucial dataset for training machine learning models in drug discovery. It provides known active molecules for specific targets alongside computationally generated "decoys" (molecules that share physical properties with actives but are topologically distinct and assumed inactive). This prevents the XGBoost model from learning artificial biases.
* **COX-2 Dataset:** Cyclooxygenase-2 (COX-2) is an enzyme responsible for inflammation and pain, and a common target for non-steroidal anti-inflammatory drugs (NSAIDs). This dataset serves as our primary biological target case study, allowing us to train and test the model on a highly relevant, real-world pharmacological target.

> **Note on Data:** Due to GitHub's file size limits, the raw dataset files (`*.csv`, `*.sdf`) are not included in this repository. You can download them directly from the links above or run the data-fetching scripts provided in the codebase.

## 📊 Methodology
1. **Data Acquisition:** Sourcing chemical compound data and their corresponding bioactivity values.
2. **Data Preprocessing & Feature Engineering:** Cleaning the dataset and utilizing **RDKit** to convert chemical structures into numerical molecular descriptors and fingerprints.
3. **Exploratory Data Analysis (EDA):** Visualizing feature distributions, chemical space, and activity thresholds.
4. **Model Training:** Training an **XGBoost** classifier to map the relationship between molecular fingerprints and bioactivity classes.
5. **Evaluation:** Assessing model performance using accuracy, precision, recall, and ROC-AUC scores.
6. **Deployment:** Building an interactive **Streamlit** web application where users can input chemical structures and receive real-time bioactivity predictions.

## 👨‍🏫 Acknowledgments
* **Mentor:** Dr. T. Swathi
* **Category:** Drug Discovery / Machine Learning

## 📊 System Architecture & Methodology

**Research Methodology & System Architecture Workflow:**
![Research Methodology](<methodology.jpg>)

**Core Data Splitting Workflow:**
![Data Splitting](<workflow.png>)