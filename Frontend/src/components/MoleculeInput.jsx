import { useState } from "react";

function MoleculeInput({ onPredict }) {
  const [smiles, setSmiles] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const value = smiles.trim();

    if (!value) {
      setError("Please enter a SMILES string.");
      return;
    }

    if (value.length < 2) {
      setError("Please enter a valid molecular structure.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/v1/predict",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            smiles: value,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Prediction failed. Please try again."
        );
      }

      onPredict(data);
    } catch (error) {
      setError(
        error.message ||
          "Unable to connect to the prediction server."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleClear = () => {
    setSmiles("");
    setError("");
    setLoading(false);
  };

  return (
    <section className="molecule-input-section" id="predict">
      <div className="molecule-input-container">

        <div className="section-heading">
          <span className="section-label">
            MOLECULE PREDICTION
          </span>

          <h2>
            Enter a molecular
            <br />
            structure
          </h2>

          <p>
            Paste a SMILES string below to analyze the molecule
            and predict its potential COX-2 bioactivity.
          </p>
        </div>

        <div className="input-card">

          <h3>SMILES Input</h3>

          <p className="input-description">
            Enter the molecular structure representation
          </p>

          <textarea
            className="smiles-input"
            placeholder="Example: CCOC(=O)c1ccccc1"
            rows="5"
            value={smiles}
            onChange={(event) => {
              setSmiles(event.target.value);
              setError("");
            }}
            onKeyDown={handleKeyDown}
          />

          {error && (
            <p className="input-error">
              {error}
            </p>
          )}

          <div className="input-actions">

            <button
              className="predict-button"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading
                ? "Analyzing Molecule..."
                : "Predict Bioactivity"}
            </button>

            <span className="smiles-suggestion">
              💡 Try: CCOC(=O)c1ccccc1
            </span>

            {smiles && (
              <button
                className="clear-button"
                onClick={handleClear}
                disabled={loading}
              >
                Clear
              </button>
            )}

          </div>

        </div>
      </div>
    </section>
  );
}

export default MoleculeInput;