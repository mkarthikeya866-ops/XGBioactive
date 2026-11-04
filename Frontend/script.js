/* =========================================================
    XGBIOACTIVE — XGBOOST BIOACTIVITY PREDICTION
    HTML + CSS + VANILLA JAVASCRIPT
    ========================================================= */
const API_HOST = window.location.hostname || "127.0.0.1";
const API_URL = `http://${API_HOST}:8000/api/v1/predict-xgb`;
const CHEMBL_API_URL = "https://www.ebi.ac.uk/chembl/api/data";
const PUBCHEM_API_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";
const PUBCHEM_AUTOCOMPLETE_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/autocomplete";

/* Input UI: these IDs match the SMILES field and buttons in index.html. */

const smilesInput = document.getElementById("smiles-input");
const exampleBtn = document.getElementById("example-btn");
const clearBtn = document.getElementById("clear-btn");
const predictBtn = document.getElementById("predict-btn");

const predictionMessage = document.getElementById("prediction-message");
const resultSection = document.getElementById("result-section");
const clinicalUsesPanel = document.getElementById("clinical-uses-panel");
const knownUsesButton = document.getElementById("lookup-known-uses-btn");
const knownUsesContent = document.getElementById("known-uses-content");
const knownUsesSource = document.getElementById("known-uses-source");

/* Result UI: classification label and explanatory text. */
const predictionValue = document.getElementById("prediction-value");
const classificationDescription =
    document.getElementById("classification-description");
const researchGuidance = document.getElementById("research-guidance-text");

/* Structure preview UI: RDKit draws into this container and updates its status. */
const structureDisplay = document.getElementById("structure-display");
const structureStatus = document.getElementById("structure-status");

const exampleSmiles = "CC(=O)Oc1ccccc1C(=O)O";
let lastPredictedSmiles = "";
let knownUsesRequestId = 0;

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

/* Resolve a compound name when the input is not valid SMILES. */

function nameEditDistance(firstName, secondName) {
    const previousRow = Array.from(
        { length: secondName.length + 1 },
        function (_, index) { return index; }
    );

    for (let rowIndex = 1; rowIndex <= firstName.length; rowIndex += 1) {
        const currentRow = [rowIndex];

        for (let columnIndex = 1; columnIndex <= secondName.length; columnIndex += 1) {
            const substitutionCost =
                firstName[rowIndex - 1] === secondName[columnIndex - 1] ? 0 : 1;

            currentRow[columnIndex] = Math.min(
                currentRow[columnIndex - 1] + 1,
                previousRow[columnIndex] + 1,
                previousRow[columnIndex - 1] + substitutionCost
            );
        }

        previousRow.splice(0, previousRow.length, ...currentRow);
    }

    return previousRow[secondName.length];
}

async function suggestCompoundName(input) {
    const normalizedInput = input.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalizedInput.length < 4) {
        return "";
    }

    const prefix = normalizedInput.slice(0, 3);
    const response = await fetch(
        `${PUBCHEM_AUTOCOMPLETE_URL}/compound/${encodeURIComponent(prefix)}/JSON?limit=50`
    );
    if (!response.ok) {
        return "";
    }

    const data = await response.json();
    const maximumDistance = Math.max(1, Math.floor(normalizedInput.length * 0.1));
    const candidates = (data.dictionary_terms?.compound || [])
        .map(function (name) {
            const normalizedName = name.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
            return { name, distance: nameEditDistance(normalizedInput, normalizedName) };
        })
        .filter(function (candidate) {
            return candidate.distance <= maximumDistance;
        })
        .sort(function (first, second) {
            return first.distance - second.distance;
        });

    if (candidates.length === 0 ||
        (candidates.length > 1 && candidates[0].distance === candidates[1].distance)) {
        return "";
    }

    return candidates[0].name;
}

async function resolveCompoundInput(input) {
    if (!RDKitModule) {
        throw new Error("RDKit is still loading. Please try again shortly.");
    }

    const molecule = RDKitModule.get_mol(input);
    if (molecule) {
        molecule.delete();
        return { smiles: input, compoundName: "", correctedName: "" };
    }

    let lookupName = input;
    let correctedName = "";
    let response = await fetch(
        `${PUBCHEM_API_URL}/compound/name/${encodeURIComponent(lookupName)}/property/CanonicalSMILES,IsomericSMILES,ConnectivitySMILES,IUPACName/JSON`
    );

    if (response.status === 404) {
        correctedName = await suggestCompoundName(input);
        if (!correctedName) {
            throw new Error(`No compound found for "${input}". Check the name or enter a valid SMILES.`);
        }

        lookupName = correctedName;
        response = await fetch(
            `${PUBCHEM_API_URL}/compound/name/${encodeURIComponent(lookupName)}/property/CanonicalSMILES,IsomericSMILES,ConnectivitySMILES,IUPACName/JSON`
        );
    }
    if (!response.ok) {
        throw new Error("PubChem name lookup is unavailable. Try again later or enter a SMILES.");
    }

    const data = await response.json();
    const records = data.PropertyTable?.Properties || [];
    if (records.length !== 1) {
        throw new Error("This name did not resolve to one unique compound. Try a more specific name or enter a SMILES.");
    }

    const record = records[0];
    const smiles = record.SMILES || record.IsomericSMILES || record.ConnectivitySMILES;
    if (!smiles) {
        throw new Error("PubChem did not provide a structure for this compound name.");
    }

    return {
        smiles,
        compoundName: lookupName,
        correctedName
    };
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

    knownUsesRequestId += 1;
    lastPredictedSmiles = "";
    clinicalUsesPanel.hidden = true;
    knownUsesButton.disabled = true;
    knownUsesContent.innerHTML = "<p>Run a prediction, then look up matching Phase-IV records.</p>";
    knownUsesSource.hidden = true;

    const predictionDetails = document.getElementById("xgb-probability-results");
    predictionDetails?.remove();

    predictionValue.textContent = "--";

    predictionValue.classList.remove("inactive");

    classificationDescription.textContent =
        "Submit a molecule to view its classification.";
    researchGuidance.textContent =
        "A model prediction is an early research signal and needs experimental validation.";

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

/* Optional use lookup: the SMILES is sent to ChEMBL only after this button is clicked. */

knownUsesButton.addEventListener("click", async function() {
    if (!lastPredictedSmiles) {
        return;
    }

    const requestId = ++knownUsesRequestId;
    knownUsesButton.disabled = true;
    knownUsesContent.textContent = "Searching ChEMBL for exact structure matches and Phase-IV indications...";
    knownUsesSource.hidden = true;

    try {
        const moleculeQuery = new URLSearchParams({
            "molecule_structures__canonical_smiles__exact": lastPredictedSmiles,
            limit: "5"
        });
        const moleculeResponse = await fetch(
            `${CHEMBL_API_URL}/molecule.json?${moleculeQuery}`
        );

        if (!moleculeResponse.ok) {
            throw new Error("ChEMBL could not be reached. Try again later.");
        }

        const moleculeData = await moleculeResponse.json();
        const matchedMolecule = (moleculeData.molecules || []).find(function (item) {
            return item.molecule_structures?.canonical_smiles === lastPredictedSmiles;
        });

        if (requestId !== knownUsesRequestId) {
            return;
        }

        knownUsesContent.replaceChildren();

        if (!matchedMolecule) {
            knownUsesContent.textContent =
                "No exact ChEMBL structure match was found, so no clinical uses are listed.";
            return;
        }

        const chemblId = matchedMolecule.molecule_chembl_id;
        const compoundName = matchedMolecule.pref_name || chemblId;
        const compoundLabel = document.createElement("p");
        compoundLabel.className = "known-uses-compound";
        compoundLabel.textContent = `${compoundName} (${chemblId})`;
        knownUsesContent.appendChild(compoundLabel);

        const indicationQuery = new URLSearchParams({
            molecule_chembl_id: chemblId,
            limit: "1000"
        });
        const indicationResponse = await fetch(
            `${CHEMBL_API_URL}/drug_indication.json?${indicationQuery}`
        );

        if (!indicationResponse.ok) {
            throw new Error("ChEMBL indications could not be loaded. Try again later.");
        }

        const indicationData = await indicationResponse.json();
        const indications = new Map();
        (indicationData.drug_indications || []).forEach(function (item) {
            if (Number(item.max_phase_for_ind) < 4) {
                return;
            }

            const name = item.mesh_heading || item.efo_term;
            if (name) {
                indications.set(name.toLocaleLowerCase(), name);
            }
        });

        const sortedIndications = [...indications.values()].sort();
        if (sortedIndications.length > 0) {
            const indicationList = document.createElement("ul");
            sortedIndications.forEach(function (name) {
                const item = document.createElement("li");
                item.textContent = name;
                indicationList.appendChild(item);
            });
            knownUsesContent.appendChild(indicationList);
        } else {
            const noIndications = document.createElement("p");
            noIndications.textContent =
                "No Phase-IV clinical indication records were found for this exact ChEMBL structure.";
            knownUsesContent.appendChild(noIndications);
        }

        knownUsesSource.href =
            `https://www.ebi.ac.uk/chembl/compound_report_card/${chemblId}/`;
        knownUsesSource.hidden = false;
    } catch (error) {
        if (requestId === knownUsesRequestId) {
            knownUsesContent.textContent =
                `${error.message} The prediction itself is unchanged.`;
        }
    } finally {
        if (requestId === knownUsesRequestId) {
            knownUsesButton.disabled = false;
        }
    }
});


/* Predict button: accept SMILES or resolve a familiar compound name first. */

predictBtn.addEventListener("click", async function() {

    const enteredInput = smilesInput.value.trim();

    if (enteredInput === "") {

        predictionMessage.textContent =
            "Please enter a compound name or SMILES first.";

        predictionMessage.className =
            "prediction-message error";

        return;

    }

    resetResults();

    /* Disable button during prediction */

    predictBtn.disabled = true;
    knownUsesRequestId += 1;
    clinicalUsesPanel.hidden = true;
    knownUsesButton.disabled = true;

    predictBtn.innerHTML =
        "<span>Predicting Bioactivity...</span>";


    predictionMessage.textContent =
        "Running the final XGBoost Morgan-fingerprint model...";

    predictionMessage.className =
        "prediction-message";

    structureStatus.textContent =
    "Analyzing molecular structure...";


    try {

        const resolvedCompound = await resolveCompoundInput(enteredInput);
        const smiles = resolvedCompound.smiles;

        await renderMolecule(smiles);

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


        displayPrediction(data, resolvedCompound);


    } catch (error) {

        console.warn(
            "Prediction API error:",
            error
        );

        predictionMessage.textContent =
            error.message.includes("Failed to fetch")
                ? "Cannot reach PubChem or the prediction API. Check your internet connection and ensure FastAPI is running at http://127.0.0.1:8000."
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

function displayPrediction(data, resolvedCompound = {}) {

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
    lastPredictedSmiles = data.canonical_smiles || data.smiles || smilesInput.value.trim();
    knownUsesButton.disabled = true;
    knownUsesContent.innerHTML = "<p>Click to search ChEMBL for Phase-IV clinical indications for this exact structure.</p>";
    knownUsesSource.hidden = true;
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

    knownUsesRequestId += 1;
    clinicalUsesPanel.hidden = formattedPrediction === "Unknown" || !lastPredictedSmiles;
    knownUsesButton.disabled = formattedPrediction === "Unknown" || !lastPredictedSmiles;

    predictionValue.textContent = formattedPrediction;
    predictionValue.classList.toggle(
        "inactive",
        formattedPrediction === "Inactive"
    );

    classificationDescription.textContent =
        formattedPrediction === "Active"
            ? "The XGBoost model predicts this molecule as Active against COX-2."
            : formattedPrediction === "Inactive"
                ? "The model did not classify this molecule as Active against COX-2. This does not mean it has no other medical uses."
                : "The XGBoost model returned an unknown prediction class.";

    researchGuidance.textContent =
        formattedPrediction === "Active"
            ? "Treat this as a research lead: prioritize confirmatory COX-2 testing, then assess selectivity, safety, and ADME properties. This result does not show that the molecule is a medicine or treatment."
            : formattedPrediction === "Inactive"
                ? "Do not discard a compound solely because of this result. It only describes this model's COX-2 prediction; the compound may still be useful for other targets or conditions that this model does not assess. This is not advice to start, stop, or avoid a medicine."
                : "Check the molecule input and prediction response before deciding on follow-up testing.";

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

    if (resolvedCompound.compoundName) {
        const resolvedName = document.createElement("p");
        const label = document.createElement("strong");
        label.textContent = resolvedCompound.correctedName
            ? "Suggested match: "
            : "Compound name: ";
        const nameText = resolvedCompound.correctedName
            ? `${resolvedCompound.compoundName} (matched from "${smilesInput.value.trim()}")`
            : resolvedCompound.compoundName;
        resolvedName.append(label, document.createTextNode(nameText));
        modelInfoContainer.querySelector(".model-results-table").appendChild(resolvedName);
    }

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