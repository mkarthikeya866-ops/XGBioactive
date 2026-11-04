/* =========================================================
    XGBIOACTIVE — XGBOOST BIOACTIVITY PREDICTION
    HTML + CSS + VANILLA JAVASCRIPT
    ========================================================= */
const API_HOST = window.location.hostname || "127.0.0.1";
const API_URL = `http://${API_HOST}:8000/api/v1/predict-xgb`;

/* Input UI: these IDs match the SMILES field and buttons in index.html. */

const smilesInput = document.getElementById("smiles-input");
const exampleBtn = document.getElementById("example-btn");
const clearBtn = document.getElementById("clear-btn");
const predictBtn = document.getElementById("predict-btn");

const predictionMessage = document.getElementById("prediction-message");
const resultSection = document.getElementById("result-section");

/* Result UI: classification label and explanatory text. */
const predictionValue = document.getElementById("prediction-value");
const classificationDescription =
    document.getElementById("classification-description");

/* Structure preview UI: RDKit draws into this container and updates its status. */
const structureDisplay = document.getElementById("structure-display");
const structureStatus = document.getElementById("structure-status");

const exampleSmiles = "CC(=O)Oc1ccccc1C(=O)O";

/* Load RDKit so the structure preview UI can render molecule drawings. */

let RDKitModule = null;

async function initializeRDKit() {
    try {
        RDKitModule = await window.initRDKitModule();

        console.log("RDKit initialized successfully.");

        structureStatus.textContent =
            "RDKit ready — enter a molecule.";

    } catch (error) {
        console.error("RDKit initialization failed:", error);

        structureStatus.textContent =
            "RDKit initialization failed.";
    }
}

initializeRDKit();

/* Structure preview UI: render an RDKit SVG inside #structure-display. */

async function renderMolecule(smiles) {

    if (!RDKitModule) {
        structureStatus.textContent =
            "RDKit is still loading. Please wait.";

        return;
    }

    try {

        const molecule = RDKitModule.get_mol(smiles);

        if (!molecule) {
            throw new Error("Invalid SMILES representation.");
        }

        molecule.set_new_coords(true);

        const svg = molecule.get_svg(400, 300);

        structureDisplay.innerHTML = svg;

        structureStatus.textContent =
            "2D molecular structure rendered successfully.";

        molecule.delete();

    } catch (error) {

        console.error("Molecule rendering error:", error);

        structureDisplay.innerHTML = `
            <div class="structure-placeholder">
                <h4>Invalid Molecule</h4>
                <p>Please enter a valid SMILES representation.</p>
            </div>
        `;

        structureStatus.textContent =
            "Unable to render molecule.";

    }

}

/* Load Example button: fill the SMILES field and preview aspirin. */

exampleBtn.addEventListener("click", async function() {

    smilesInput.value = exampleSmiles;

    predictionMessage.textContent =
        "Aspirin example loaded. Click Predict Bioactivity.";

    predictionMessage.className =
        "prediction-message";

    structureStatus.textContent =
        "Rendering aspirin structure...";

    await renderMolecule(exampleSmiles);

});

/* Reset the result and descriptor UI before the next prediction. */

function resetResults() {

    predictionValue.textContent = "--";

    predictionValue.classList.remove("inactive");

    classificationDescription.textContent =
        "Submit a molecule to view its classification.";

    /* Reset main descriptors */

    const descriptorIds = [
        "mw-value",
        "logp-value",
        "tpsa-value",
        "hbd-value",
        "hba-value",
        "rotatable-value"
    ];

    descriptorIds.forEach(function(id) {

        const element = document.getElementById(id);

        if (element) {
            element.textContent = "--";
        }

    });


    /* Reset molecular structure */

    structureDisplay.innerHTML = `

        <div class="structure-placeholder">

            <div class="structure-placeholder-icon">⌬</div>

            <h4>Molecular Visualization</h4>

            <p>
                Your molecule's 2D structure will appear here.
            </p>

        </div>

    `;

   structureStatus.textContent =
    RDKitModule
        ? "RDKit ready — enter a molecule."
        : "Waiting for RDKit initialization...";
}


/* Clear button: empty the input and reset the prediction UI. */

clearBtn.addEventListener("click", function() {

    smilesInput.value = "";

    predictionMessage.textContent = "";
    predictionMessage.className =
        "prediction-message";

    resetResults();

});


/* Predict button: send the entered SMILES to the XGBoost API. */

predictBtn.addEventListener("click", async function() {

    const smiles = smilesInput.value.trim();

    if (smiles === "") {

        predictionMessage.textContent =
            "Please enter a SMILES representation first.";

        predictionMessage.className =
            "prediction-message error";

        return;

    }


    /* Disable button during prediction */

    predictBtn.disabled = true;

    predictBtn.innerHTML =
        "<span>Predicting Bioactivity...</span>";


    predictionMessage.textContent =
        "Running the final XGBoost Morgan-fingerprint model...";

    predictionMessage.className =
        "prediction-message";

    structureStatus.textContent =
    "Analyzing molecular structure...";

await renderMolecule(smiles);


    try {

        const response = await fetch(API_URL, {

            method: "POST",

            headers: {

                "Content-Type": "application/json",

                "Accept": "application/json"

            },

            body: JSON.stringify({

                smiles: smiles

            })

        });


        const data = await response.json();


        if (!response.ok) {

            const errorMessage =
                typeof data.detail === "string"
                    ? data.detail
                    : JSON.stringify(data.detail);

            throw new Error(
                errorMessage || "Prediction request failed."
            );

        }


        displayPrediction(data);


    } catch (error) {

        console.error(
            "Prediction API error:",
            error
        );

        predictionMessage.textContent =
            error.message.includes("Failed to fetch")
                ? "Cannot connect to backend. Ensure FastAPI is running at http://127.0.0.1:8000."
                : error.message;

        predictionMessage.className =
            "prediction-message error";

        structureStatus.textContent =
            "Prediction failed";


    } finally {

        predictBtn.disabled = false;

        predictBtn.innerHTML =
            "<span>Predict Bioactivity</span><span>→</span>";

    }

});


/* Result UI: fill classification and descriptor values from the API response. */

function displayPrediction(data) {

    if (!data) {
        throw new Error("Backend did not return any prediction data.");
    }

    const predictionText =
        typeof data.prediction === "string"
            ? data.prediction
            : typeof data.class_id === "number"
                ? (data.class_id === 1 ? "Active" : "Inactive")
                : "Unknown";

    const prediction = predictionText.toLowerCase();
    const descriptors =
        data.molecular_descriptors && typeof data.molecular_descriptors === "object"
            ? data.molecular_descriptors
            : data.descriptors && typeof data.descriptors === "object"
                ? data.descriptors
                : {};

    const formattedPrediction =
        prediction === "active"
            ? "Active"
            : prediction === "inactive"
                ? "Inactive"
                : predictionText;

    predictionValue.textContent = formattedPrediction;
    predictionValue.classList.toggle(
        "inactive",
        formattedPrediction === "Inactive"
    );

    classificationDescription.textContent =
        formattedPrediction === "Active"
            ? "The XGBoost model predicts this molecule as Active against COX-2."
            : formattedPrediction === "Inactive"
                ? "The XGBoost model predicts this molecule as Inactive against COX-2."
                : "The XGBoost model returned an unknown prediction class.";

    const descriptorMap = {
        "mw-value": descriptors.molecular_weight ?? descriptors.Molecular_Weight,
        "logp-value": descriptors.logp ?? descriptors.LogP,
        "tpsa-value": descriptors.tpsa ?? descriptors.TPSA,
        "hbd-value": descriptors.h_bond_donors ?? descriptors.HBD,
        "hba-value": descriptors.h_bond_acceptors ?? descriptors.HBA,
        "rotatable-value": descriptors.rotatable_bonds ?? descriptors.Rotatable_Bonds
    };

    Object.entries(descriptorMap).forEach(function ([id, value]) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent =
                value !== undefined && value !== null
                    ? Number(value).toFixed(2)
                    : "--";
        }
    });

    let modelInfoContainer = document.getElementById("xgb-probability-results");

    if (!modelInfoContainer) {
        modelInfoContainer = document.createElement("div");
        modelInfoContainer.id = "xgb-probability-results";
        modelInfoContainer.className = "prediction-details";
        resultSection.appendChild(modelInfoContainer);
    }

    modelInfoContainer.innerHTML = `
        <h3>XGBoost Prediction Details</h3>

        <div class="model-results-table">
            <p><strong>Model:</strong> ${data.model || "XGBoost"}</p>
            <p><strong>Target:</strong> ${data.target || "COX-2"}</p>
            <p><strong>SMILES:</strong> ${data.smiles || "Not available"}</p>
            <p><strong>Predicted Class:</strong> ${formattedPrediction}</p>
        </div>
    `;

    predictionMessage.textContent =
        "XGBoost prediction completed successfully. This is a model prediction, not a confirmed biological result.";
    predictionMessage.className = "prediction-message success";
    structureStatus.textContent =
        "Molecular structure rendered; XGBoost prediction completed.";

    if (resultSection) {
        resultSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}



/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", function() {

    console.log(
        "XGBioactive frontend initialized."
    );

    console.log(
        "XGBoost prediction API:",
        API_URL
    );

});