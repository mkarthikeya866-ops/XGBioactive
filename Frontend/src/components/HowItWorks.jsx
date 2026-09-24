import {
  FlaskConical,
  Atom,
  Database,
  Brain,
  Activity,
} from "lucide-react";

function HowItWorks() {
  const steps = [
    {
      number: "01",
      icon: FlaskConical,
      title: "Enter SMILES",
      description:
        "Provide the molecular structure of the compound using its SMILES representation.",
    },
    {
      number: "02",
      icon: Atom,
      title: "Calculate Descriptors",
      description:
        "RDKit converts the molecular structure into important numerical molecular descriptors.",
    },
    {
      number: "03",
      icon: Database,
      title: "Process Features",
      description:
        "The molecular descriptors are prepared as features for the machine learning model.",
    },
    {
      number: "04",
      icon: Brain,
      title: "XGBoost Prediction",
      description:
        "The trained XGBoost model analyzes the molecular features and predicts bioactivity.",
    },
    {
      number: "05",
      icon: Activity,
      title: "View Result",
      description:
        "The application displays the predicted bioactivity along with molecular analysis.",
    },
  ];

  return (
    <section className="how-it-works" id="how-it-works">
      <div className="how-it-works-container">

        {/* HOW IT WORKS HEADER */}

        <div className="section-heading">
          <span className="section-label">HOW IT WORKS</span>

          <h2>
            From molecular structure
            <br />
            to bioactivity prediction
          </h2>

          <p>
            The system uses RDKit for molecular feature extraction
            and XGBoost to predict the potential bioactivity of
            molecules against COX-2.
          </p>
        </div>

        {/* STEPS */}

        <div className="steps-container">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <div className="step-card" key={step.number}>
                <div className="step-top">
                  <span className="step-number">
                    {step.number}
                  </span>

                  <div className="step-icon">
                    <Icon size={22} strokeWidth={1.7} />
                  </div>
                </div>

                <h3>{step.title}</h3>

                <p>{step.description}</p>
              </div>
            );
          })}
        </div>

        {/* PROJECT PIPELINE */}

        <div className="pipeline-section">

          <div className="pipeline-heading">
            <span className="section-label">
              PROJECT PIPELINE
            </span>

            <h3>
              From molecular data to prediction
            </h3>
          </div>

          <div className="pipeline">

            <div className="pipeline-step">
              <span>01</span>
              <strong>ChEMBL</strong>
              <p>Bioactivity Data</p>
            </div>

            <div className="pipeline-arrow">
              →
            </div>

            <div className="pipeline-step">
              <span>02</span>
              <strong>Processing</strong>
              <p>Clean &amp; Prepare</p>
            </div>

            <div className="pipeline-arrow">
              →
            </div>

            <div className="pipeline-step">
              <span>03</span>
              <strong>RDKit</strong>
              <p>Structure Analysis</p>
            </div>

            <div className="pipeline-arrow">
              →
            </div>

            <div className="pipeline-step">
              <span>04</span>
              <strong>Descriptors</strong>
              <p>Molecular Features</p>
            </div>

            <div className="pipeline-arrow">
              →
            </div>

            <div className="pipeline-step">
              <span>05</span>
              <strong>XGBoost</strong>
              <p>Classification</p>
            </div>

            <div className="pipeline-arrow">
              →
            </div>

            <div className="pipeline-step">
              <span>06</span>
              <strong>Prediction</strong>
              <p>Bioactivity Result</p>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}

export default HowItWorks;