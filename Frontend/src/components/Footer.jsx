function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <div className="footer-logo">
            <div className="footer-logo-icon">
              🧪
            </div>
            <span>XGBioactive</span>
          </div>

          <p>
            AI-powered molecular bioactivity prediction
            for drug discovery research.
          </p>
        </div>

        <div className="footer-links">
          <a href="/#home">Home</a>
          <a href="/#how-it-works">How It Works</a>
          <a href="/#about">About</a>
        </div>

        <a
          href="https://github.com/mkarthikeya866-ops/XGBioactive"
          target="_blank"
          rel="noreferrer"
          className="github-link"
        >
          GitHub
        </a>
      </div>

      <div className="footer-bottom">
        <span>© 2026 XGBioactive</span>
        <span>COX-2 • RDKit • XGBoost</span>
      </div>
    </footer>
  );
}

export default Footer;