function PredictionResult({ data }) {
  const isActive = data?.prediction?.toLowerCase() === "active";

  const descriptors = data?.descriptors || {};

  return (
    <section className="prediction-section">
      <div className="prediction-container">

        <div className="prediction-heading">
          <span className="section-label">
            PREDICTION RESULT
          </span>

          <h2>Bioactivity Analysis</h2>

          <p>
            A summary of the predicted molecular bioactivity and
            calculated molecular properties.
          </p>
        </div>

        <div className="prediction-card">

          {/* Prediction Status */}
          <div className="prediction-status">
            <div>
              <span className="status-label">
                PREDICTED ACTIVITY
              </span>

              <h3>
                {isActive ? "ACTIVE" : "INACTIVE"}
              </h3>

              <p>
                {isActive
                  ? "The molecule shows potential biological activity against COX-2."
                  : "The molecule is predicted to have lower biological activity against COX-2."}
              </p>
            </div>

            <div className="activity-indicator">
              <span></span>
              {isActive ? "Active" : "Inactive"}
            </div>
          </div>

          {/* Confidence */}
          <div className="confidence-box">
            <span>Model Confidence</span>

            <strong>
              {(Number(data?.confidence || 0) * 100).toFixed(1)}%
            </strong>
          </div>

          {/* Molecular Descriptors */}
          <div className="descriptor-section">
            <h3>Molecular Descriptors</h3>

            <div className="descriptor-grid">

              <div className="descriptor">
                <span>Molecular Weight</span>
                <strong>
                  {Number(
                    descriptors.molecular_weight || 0
                  ).toFixed(3)}{" "}
                  g/mol
                </strong>
              </div>

              <div className="descriptor">
                <span>LogP</span>
                <strong>
                  {Number(
                    descriptors.logp || 0
                  ).toFixed(3)}
                </strong>
              </div>

              <div className="descriptor">
                <span>TPSA</span>
                <strong>
                  {Number(
                    descriptors.tpsa || 0
                  ).toFixed(2)}{" "}
                  Å²
                </strong>
              </div>

              <div className="descriptor">
                <span>H-Bond Donors</span>
                <strong>
                  {descriptors.h_bond_donors ?? 0}
                </strong>
              </div>

              <div className="descriptor">
                <span>H-Bond Acceptors</span>
                <strong>
                  {descriptors.h_bond_acceptors ?? 0}
                </strong>
              </div>

              <div className="descriptor">
                <span>Rotatable Bonds</span>
                <strong>
                  {descriptors.rotatable_bonds ?? 0}
                </strong>
              </div>

            </div>
          </div>

          {/* Molecule */}
          <div className="interpretation-box">
            <h3>Analyzed Molecule</h3>

            <p>
              <strong>SMILES:</strong>
            </p>

            <code className="result-smiles">
              {data?.smiles}
            </code>
          </div>

          {/* Interpretation */}
          <div className="interpretation-box">
            <h3>How to interpret this result</h3>

            <p>
              The prediction represents the classification produced
              by the trained XGBoost model using molecular descriptors
              calculated from the submitted SMILES structure.
            </p>

            <p>
              The confidence value represents the model's predicted
              probability associated with the displayed classification.
            </p>
          </div>

          {/* Model Information */}
          <div className="demo-warning">
            <span>ⓘ</span>

            <p>
              Prediction generated using the{" "}
              <strong>{data?.model || "XGBoost"}</strong> model
              for the <strong>{data?.target || "COX-2"}</strong> target.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}

export default PredictionResult;