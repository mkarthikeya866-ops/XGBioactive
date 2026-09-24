import { Link, useLocation } from "react-router-dom";

function Navbar() {
  const location = useLocation();

  const smoothScrollTo = (id) => {
    if (location.pathname !== "/") {
      window.location.href = `/#${id}`;
      return;
    }

    const section = document.getElementById(id);

    if (!section) return;

    const startPosition = window.scrollY;
    const targetPosition =
      section.getBoundingClientRect().top + window.scrollY;

    const distance = targetPosition - startPosition;
    const duration = 1200;

    let startTime = null;

    const easeInOut = (t) => {
      return t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;
    };

    const animateScroll = (currentTime) => {
      if (!startTime) {
        startTime = currentTime;
      }

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOut(progress);

      window.scrollTo(
        0,
        startPosition + distance * easedProgress
      );

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  };

  const goHome = () => {
    if (location.pathname !== "/") {
      window.location.href = "/";
      return;
    }

    const startPosition = window.scrollY;
    const duration = 1000;

    let startTime = null;

    const easeOut = (t) => {
      return 1 - Math.pow(1 - t, 3);
    };

    const animateHome = (currentTime) => {
      if (!startTime) {
        startTime = currentTime;
      }

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);

      window.scrollTo(
        0,
        startPosition * (1 - easedProgress)
      );

      if (progress < 1) {
        requestAnimationFrame(animateHome);
      }
    };

    requestAnimationFrame(animateHome);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">

        <button
          className="navbar-logo"
          onClick={goHome}
        >
          XGBioactive
        </button>

        <div className="navbar-links">

          <button
            className="nav-scroll-button"
            onClick={goHome}
          >
            Home
          </button>

          <button
            className="nav-scroll-button"
            onClick={() => smoothScrollTo("how-it-works")}
          >
            How It Works
          </button>

          <button
            className="nav-scroll-button"
            onClick={() => smoothScrollTo("about")}
          >
            About
          </button>

          <Link
            to="/prediction"
            className="navbar-predict"
          >
            Try Prediction
          </Link>

        </div>
      </div>
    </nav>
  );
}

export default Navbar;