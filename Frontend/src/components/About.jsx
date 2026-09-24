import {
  Target,
  Database,
  Brain,
  FlaskConical,
} from "lucide-react";

function About() {
  return (
    <section className="about-section" id="about">
      <div className="about-container">

        <div className="about-content">
          <span className="section-label">
            ABOUT THE PROJECT
          </span>

          <h2>
            Machine learning for
            <br />
            bioactive molecule discovery
          </h2>

          <p>
            XGBioactive is a machine learning based application
            designed to predict the potential bioactivity of
            molecules against COX-2.
          </p>

          <p>
            The project combines molecular descriptors generated
            using RDKit with an XGBoost classification model to
            analyze molecular structures and predict whether a
            compound may be biologically active.
          </p>
        </div>

        <div className="about-cards">

          <div className="about-card">
            <div className="about-card-icon">
              <Target size={22} />
            </div>

            <div>
              <h3>Target</h3>
              <p>COX-2 / Cyclooxygenase-2</p>
            </div>
          </div>

          <div className="about-card">
            <div className="about-card-icon">
              <Database size={22} />
            </div>

            <div>
              <h3>Dataset</h3>
              <p>ChEMBL bioactivity data</p>
            </div>
          </div>

          <div className="about-card">
            <div className="about-card-icon">
              <FlaskConical size={22} />
            </div>

            <div>
              <h3>Descriptors</h3>
              <p>RDKit molecular descriptors</p>
            </div>
          </div>

          <div className="about-card">
            <div className="about-card-icon">
              <Brain size={22} />
            </div>

            <div>
              <h3>Model</h3>
              <p>XGBoost classifier</p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

export default About;