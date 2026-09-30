const API_URL = "http://127.0.0.1:8000";

const smilesInput = document.getElementById("smilesInput");
const predictButton = document.getElementById("predictButton");
const clearButton = document.getElementById("clearButton");
const exampleButton = document.getElementById("exampleButton");

const resultSection = document.getElementById("resultSection");
const errorMessage = document.getElementById("errorMessage");

const predictionResult = document.getElementById("predictionResult");
const confidenceValue = document.getElementById("confidenceValue");

const molecularWeight = document.getElementById("molecularWeight");
const logP = document.getElementById("logP");
const tpsa = document.getElementById("tpsa");
const hbd = document.getElementById("hbd");
const hba = document.getElementById("hba");
const rotatableBonds = document.getElementById("rotatableBonds");

const resultSmiles = document.getElementById("resultSmiles");


// Example molecule
exampleButton.addEventListener("click", () => {
    smilesInput.value = "CCOC(=O)c1ccccc1";
});


// Clear
clearButton.addEventListener("click", () => {
    smilesInput.value = "";
    resultSection.classList.add("hidden");
    errorMessage.textContent = "";
});


// Predict
predictButton.addEventListener("click", async () => {

    const smiles = smilesInput.value.trim();

    errorMessage.textContent = "";

    if (!smiles) {
        errorMessage.textContent = "Please enter a SMILES string.";
        return;
    }

    predictButton.disabled = true;
    predictButton.textContent = "Predicting...";

    try {

        const response = await fetch(`${API_URL}/api/v1/predict`, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                smiles: smiles
            })
        });


        const data = await response.json();


        if (!response.ok) {
            throw new Error(
                data.detail || "Prediction failed."
            );
        }


        // Show result
        resultSection.classList.remove("hidden");


        predictionResult.textContent =
            data.prediction || "--";


        confidenceValue.textContent =
            data.confidence !== undefined
                ? `${Number(data.confidence).toFixed(1)}%`
                : "--";


        // Molecular descriptors
        molecularWeight.textContent =
            data.descriptors?.molecular_weight !== undefined
                ? Number(data.descriptors.molecular_weight).toFixed(2)
                : "--";


        logP.textContent =
            data.descriptors?.logp !== undefined
                ? Number(data.descriptors.logp).toFixed(2)
                : "--";


        tpsa.textContent =
            data.descriptors?.tpsa !== undefined
                ? Number(data.descriptors.tpsa).toFixed(2)
                : "--";


        hbd.textContent =
            data.descriptors?.h_bond_donors !== undefined
                ? data.descriptors.h_bond_donors
                : "--";


        hba.textContent =
            data.descriptors?.h_bond_acceptors !== undefined
                ? data.descriptors.h_bond_acceptors
                : "--";


        rotatableBonds.textContent =
            data.descriptors?.rotatable_bonds !== undefined
                ? data.descriptors.rotatable_bonds
                : "--";


        resultSmiles.textContent =
            data.smiles || smiles;


        // Scroll to result
        resultSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

    catch (error) {

        resultSection.classList.add("hidden");

        errorMessage.textContent =
            error.message || "Unable to connect to backend.";

    }

    finally {

        predictButton.disabled = false;
        predictButton.textContent = "Predict Bioactivity";

    }

});