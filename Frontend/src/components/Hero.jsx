import { Link } from "react-router-dom";
import { ArrowRight, FlaskConical, Sparkles } from "lucide-react";

function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero-container">

        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={15} />
            <span>AI-Powered Drug Discovery</span>
          </div>

          <h1>
            Predict Bioactivity
            <br />
            from Molecular Structure
          </h1>

          <p className="hero-description">
            Explore whether a molecule may be biologically active against
            COX-2 using molecular descriptors and an XGBoost machine
            learning model.
          </p>

          <div className="hero-actions">
            <Link to="/prediction" className="hero-button">
  Try Prediction
  <ArrowRight size={18} />
</Link>

            <a href="#how-it-works" className="hero-secondary-button">
              How It Works
            </a>
          </div>

          <div className="hero-meta">
            <span>COX-2</span>
            <span>•</span>
            <span>XGBoost</span>
            <span>•</span>
            <span>RDKit</span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="molecule-card">
            <div className="molecule-card-header">
              <span>Molecular Structure</span>
              <FlaskConical size={19} />
            </div>

            <div className="molecule-illustration">
              <div className="molecule-center">
                <FlaskConical size={48} strokeWidth={1.4} />
              </div>

              <span className="molecule-dot dot-one"></span>
              <span className="molecule-dot dot-two"></span>
              <span className="molecule-dot dot-three"></span>
              <span className="molecule-dot dot-four"></span>

              <span className="molecule-line line-one"></span>
              <span className="molecule-line line-two"></span>
              <span className="molecule-line line-three"></span>
              <span className="molecule-line line-four"></span>
            </div>

            <div className="molecule-label">
              <span>SMILES</span>
              <code>COX-2 molecule analysis</code>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

export default Hero;