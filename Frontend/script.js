/* =========================================================
   XGBIOACTIVE — FIVE MODEL BACKEND INTEGRATION
   HTML + CSS + VANILLA JAVASCRIPT
   ========================================================= */
const API_HOST = window.location.hostname || "127.0.0.1";
const API_URL = `http://${API_HOST}:8000/api/v1/predict-xgb`;
const METRICS_API_URL = `http://${API_HOST}:8000/api/v1/model-metrics`;

/* =========================================================
   ELEMENTS
   ========================================================= */

const smilesInput = document.getElementById("smiles-input");
const exampleBtn = document.getElementById("example-btn");
const clearBtn = document.getElementById("clear-btn");
const predictBtn = document.getElementById("predict-btn");

const predictionMessage = document.getElementById("prediction-message");
const resultSection = document.getElementById("result-section");

const predictionValue = document.getElementById("prediction-value");
const classificationDescription =
    document.getElementById("classification-description");


    const confidenceValue = document.getElementById("confidence-value");
const confidenceFill = document.getElementById("confidence-fill");

const structureDisplay = document.getElementById("structure-display");
const structureStatus = document.getElementById("structure-status");

const exampleSmiles = "CC(=O)Oc1ccccc1C(=O)O";

/* =========================================================
   RDKIT INITIALIZATION
   ========================================================= */

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

/* =========================================================
   RENDER MOLECULAR 2D STRUCTURE
   ========================================================= */

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

/* =========================================================
   MODEL COMPARISON DATA
   ========================================================= */

const modelNames = [
    "XGBoost",
    "Random Forest",
    "Linear SVM",
    "RBF Network",
    "Naive Bayes"
];

const accuracyData = [74.80, null, null, null, null];
const f1Data = [82.21, null, null, null, null];
const rocAucData = [79.42, null, null, null, null];

const chartColors = [
    "#8FA88A",
    "#D8A88F",
    "#A797C7",
    "#D5B5C9",
    "#B7C7D9"
];

const chartBorderColors = [
    "#718D6C",
    "#C28D73",
    "#8E7BAF",
    "#BB98B0",
    "#96ADC3"
];


/* =========================================================
   CHART DEFAULT CONFIGURATION
   ========================================================= */

if (typeof Chart !== "undefined") {

    Chart.defaults.font.family = "DM Sans";
    Chart.defaults.font.size = 11;
    Chart.defaults.color = "#8C7B6E";

    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.padding = 18;

}


/* =========================================================
   CREATE BAR CHART
   ========================================================= */

function createBarChart(canvasId, chartLabel, chartData) {

    const canvas = document.getElementById(canvasId);

    if (!canvas || typeof Chart === "undefined") {
        return null;
    }

    return new Chart(canvas, {

        type: "bar",

        data: {

            labels: modelNames,

            datasets: [{

                label: chartLabel,
                data: chartData,

                backgroundColor: chartColors,
                borderColor: chartBorderColors,

                borderWidth: 1.5,
                borderRadius: 8,

                barPercentage: 0.65,
                categoryPercentage: 0.75

            }]

        },

        options: {

            responsive: true,
            maintainAspectRatio: false,

            animation: {
                duration: 800
            },

            plugins: {

                legend: {
                    display: false
                },

                tooltip: {

                    backgroundColor: "#49382E",
                    titleColor: "#FFFFFF",
                    bodyColor: "#F5EEE7",

                    padding: 12,
                    cornerRadius: 10,

                    callbacks: {

                        label: function(context) {

                            if (context.raw === null) {
                                return "Metrics pending";
                            }

                            return chartLabel + ": " +
                                context.raw.toFixed(2) + "%";

                        }

                    }

                }

            },

            scales: {

                y: {

                    beginAtZero: true,
                    max: 100,

                    grid: {
                        color: "#F0E6DD"
                    },

                    ticks: {

                        stepSize: 20,

                        callback: function(value) {
                            return value + "%";
                        }

                    }

                },

                x: {

                    grid: {
                        display: false
                    },

                    ticks: {

                        maxRotation: 0,
                        minRotation: 0,

                        font: {
                            size: 10
                        }

                    }

                }

            }

        }

    });

}


/* =========================================================
   INITIALIZE CHARTS
   ========================================================= */

const accuracyChart = createBarChart(
    "accuracy-chart",
    "Accuracy",
    accuracyData
);

const f1Chart = createBarChart(
    "f1-chart",
    "F1-Score",
    f1Data
);

const rocChart = createBarChart(
    "roc-chart",
    "ROC-AUC",
    rocAucData
);


/* =========================================================
   RADAR CHART
   ========================================================= */

const radarCanvas = document.getElementById("radar-chart");

let radarChart = null;

if (radarCanvas && typeof Chart !== "undefined") {

    radarChart = new Chart(radarCanvas, {

        type: "radar",

        data: {

            labels: [
                "Accuracy",
                "Precision",
                "Recall",
                "F1-Score",
                "ROC-AUC"
            ],

            datasets: [{

                label: "XGBoost",

                data: [
                    74.80,
                    85.06,
                    79.54,
                    82.21,
                    79.42
                ],

                backgroundColor: "rgba(143, 168, 138, 0.25)",
                borderColor: "#8FA88A",

                pointBackgroundColor: "#718D6C",
                pointBorderColor: "#FFFFFF",

                pointRadius: 5,
                borderWidth: 2

            }]

        },

        options: {

            responsive: true,
            maintainAspectRatio: false,

            plugins: {

                legend: {
                    position: "bottom"
                },

                tooltip: {

                    backgroundColor: "#49382E",
                    padding: 12,

                    callbacks: {

                        label: function(context) {

                            return context.dataset.label + ": " +
                                context.raw.toFixed(2) + "%";

                        }

                    }

                }

            },

            scales: {

                r: {

                    beginAtZero: true,
                    min: 0,
                    max: 100,

                    ticks: {

                        stepSize: 20,
                        backdropColor: "transparent",

                        callback: function(value) {
                            return value + "%";
                        }

                    },

                    grid: {
                        color: "#E9DED4"
                    },

                    angleLines: {
                        color: "#E9DED4"
                    },

                    pointLabels: {

                        color: "#80685B",

                        font: {
                            size: 11,
                            weight: "600"
                        }

                    }

                }

            }

        }

    });

}

/* =========================================================
   LOAD VERIFIED MODEL COMPARISON METRICS
   ========================================================= */

async function loadModelMetrics() {

    const table = document.getElementById("model-comparison-table");
    const note = document.getElementById("model-metrics-note");

    try {
        const response = await fetch(METRICS_API_URL, {
            headers: { "Accept": "application/json" }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                typeof data.detail === "string"
                    ? data.detail
                    : "Could not load comparison metrics."
            );
        }

        if (!Array.isArray(data.models) || data.models.length === 0) {
            throw new Error("The API returned no model comparison metrics.");
        }

        const metricsByModel = new Map(
            data.models.map(function (model) {
                return [model.model, model];
            })
        );
        const metricKeys = [
            "accuracy",
            "precision",
            "recall",
            "f1_score",
            "roc_auc"
        ];

        if (table) {
            table.querySelectorAll("tbody tr[data-model]").forEach(function (row) {
                const metrics = metricsByModel.get(row.dataset.model);

                if (!metrics) {
                    return;
                }

                metricKeys.forEach(function (key, index) {
                    const value = Number(metrics[key]);
                    const cell = row.cells[index + 1];

                    if (cell && Number.isFinite(value)) {
                        cell.textContent = (value * 100).toFixed(2) + "%";
                        cell.classList.remove("placeholder-metric");
                    }
                });
            });
        }

        [
            [accuracyChart, "accuracy"],
            [f1Chart, "f1_score"],
            [rocChart, "roc_auc"]
        ].forEach(function ([chart, key]) {
            if (!chart) {
                return;
            }

            chart.data.datasets[0].data = modelNames.map(function (name) {
                const value = metricsByModel.get(name)?.[key];
                return Number.isFinite(Number(value)) ? Number(value) * 100 : null;
            });
            chart.update();
        });

        const xgboostMetrics = metricsByModel.get("XGBoost");
        if (radarChart && xgboostMetrics) {
            radarChart.data.datasets[0].data = metricKeys.map(function (key) {
                return Number(xgboostMetrics[key]) * 100;
            });
            radarChart.update();
        }

        if (note) {
            const testSamples = Number(data.test_samples);
            note.textContent = Number.isFinite(testSamples)
                ? `${data.evaluation} Test set: ${testSamples} molecules.`
                : data.evaluation;
        }
    } catch (error) {
        console.error("Model comparison metrics error:", error);

        if (table) {
            table.querySelectorAll("tbody tr[data-model] td:not(:first-child)")
                .forEach(function (cell) {
                    cell.textContent = "Unavailable";
                });
        }

        if (note) {
            note.textContent =
                "Could not load verified metrics. Start the backend and run the model-comparison training step.";
        }
    }
}


/* =========================================================
   LOAD EXAMPLE
   ========================================================= */

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

/* =========================================================
   RESET RESULTS
   ========================================================= */

function resetResults() {

    predictionValue.textContent = "--";

    predictionValue.classList.remove("inactive");

    classificationDescription.textContent =
        "Submit a molecule to view its classification.";

    confidenceValue.textContent = "--";

    confidenceFill.style.width = "0%";


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


    /* Reset additional descriptors */

    const extraDescriptors = document.getElementById(
        "extra-descriptors-grid"
    );

    if (extraDescriptors) {
        extraDescriptors.innerHTML = "";
    }


    /* Remove five-model comparison table */

    const comparisonContainer = document.getElementById(
        "model-comparison-results"
    );

    if (comparisonContainer) {
        comparisonContainer.remove();
    }


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


/* =========================================================
   CLEAR BUTTON
   ========================================================= */

clearBtn.addEventListener("click", function() {

    smilesInput.value = "";

    predictionMessage.textContent = "";
    predictionMessage.className =
        "prediction-message";

    resetResults();

});


/* =========================================================
   PREDICT BIOACTIVITY — ALL FIVE MODELS
   ========================================================= */

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


        /* Display all five predictions */

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


/* =========================================================
   DISPLAY FINAL XGBOOST PREDICTION
   ========================================================= */

/* =========================================================
   DISPLAY XGBOOST BIOACTIVITY PREDICTION
   ========================================================= */

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
    const confidence = Number(
        data.confidence ?? data.probability ?? data.probability_active ?? 0
    );
    const descriptors =
        data.molecular_descriptors && typeof data.molecular_descriptors === "object"
            ? data.molecular_descriptors
            : data.descriptors && typeof data.descriptors === "object"
                ? data.descriptors
                : {};

    if (!Number.isFinite(confidence)) {
        throw new Error("Invalid confidence value received from backend.");
    }

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

    const confidencePercentage = Math.max(0, Math.min(confidence * 100, 100));

    confidenceValue.textContent = confidencePercentage.toFixed(2) + "%";
    confidenceFill.style.width = confidencePercentage.toFixed(2) + "%";

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

    displayAdditionalDescriptors(descriptors);

    let modelInfoContainer = document.getElementById("xgb-probability-results");

    if (!modelInfoContainer) {
        modelInfoContainer = document.createElement("div");
        modelInfoContainer.id = "xgb-probability-results";
        modelInfoContainer.className = "model-comparison-results";
        resultSection.appendChild(modelInfoContainer);
    }

    modelInfoContainer.innerHTML = `
        <h3>XGBoost Prediction Details</h3>

        <div class="model-results-table">
            <p><strong>Model:</strong> ${data.model || "XGBoost"}</p>
            <p><strong>Target:</strong> ${data.target || "COX-2"}</p>
            <p><strong>SMILES:</strong> ${data.smiles || "Not available"}</p>
            <p><strong>Predicted Class:</strong> ${formattedPrediction}</p>
            <p><strong>Confidence:</strong> ${confidencePercentage.toFixed(2)}%</p>
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
   DISPLAY ADDITIONAL DESCRIPTORS
   ========================================================= */

function displayAdditionalDescriptors(descriptors) {

    const descriptorContainer =
        document.querySelector(".descriptors-card");

    if (!descriptorContainer) {
        return;
    }


    let extraGrid =
        document.getElementById("extra-descriptors-grid");


    if (!extraGrid) {

        extraGrid = document.createElement("div");

        extraGrid.id =
            "extra-descriptors-grid";

        extraGrid.className =
            "descriptor-grid";

        extraGrid.style.marginTop =
            "20px";

        descriptorContainer.appendChild(
            extraGrid
        );

    }


    const additionalDescriptors = {

        "Exact Molecular Weight":
            descriptors.Exact_Molecular_Weight,

        "Aromatic Rings":
            descriptors.Aromatic_Rings,

        "Total Rings":
            descriptors.Total_Rings,

        "Heavy Atom Count":
            descriptors.Heavy_Atom_Count,

        "Fraction Csp3":
            descriptors.Fraction_Csp3,

        "Formal Charge":
            descriptors.Formal_Charge,

        "Atom Count":
            descriptors.Atom_Count,

        "Bond Count":
            descriptors.Bond_Count

    };


    extraGrid.innerHTML = "";


    Object.entries(additionalDescriptors).forEach(
        function([name, value]) {

            const card = document.createElement("div");

            card.className =
                "descriptor-item";


            const title = document.createElement("p");

            title.textContent =
                name;


            const result = document.createElement("h4");

            result.textContent =
                value !== undefined && value !== null
                    ? value
                    : "--";


            card.appendChild(title);

            card.appendChild(result);


            extraGrid.appendChild(card);

        }
    );

}


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", function() {

    console.log(
        "XGBioactive frontend initialized."
    );

    console.log(
        "Model comparison charts initialized."
    );

    console.log(
        "Five-model prediction API:",
        API_URL
    );

    loadModelMetrics();

});