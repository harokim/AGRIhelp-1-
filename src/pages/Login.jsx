import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getMedia } from "../mediaStore";
import { OFFICE_NAME } from "../utils";
import { firebaseConfigured } from "../firebase";

import bgFallback from "../assets/login-bg.jpg";
import agriPhoto1 from "../assets/agri-photo-1.png";
import agriPhoto2 from "../assets/agri-photo-2.png";
import agriPhoto3 from "../assets/agri-photo-3.png";
import agriPhoto4 from "../assets/agri-photo-4.png";

export default function Login() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [cover, setCover] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCover() {
      try {
        const savedCover = await getMedia("site-cover");

        if (active && savedCover) {
          setCover(savedCover);
        }
      } catch {
        if (active) {
          setCover("");
        }
      }
    }

    loadCover();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      const loggedInUser = await login(
        email.trim(),
        password
      );

      if (!loggedInUser) {
        setError("Invalid email or password.");
        return;
      }

      if (loggedInUser.role === "engineer") {
        navigate("/engineer");
      } else {
        navigate("/client");
      }
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Login failed. Please check your email and password."
      );
    }
  }

  function scrollToLogin() {
    document
      .getElementById("login-section")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <main className="landing-page">
      <button
        type="button"
        className="floating-theme-toggle"
        onClick={toggleTheme}
        aria-label={
          theme === "light"
            ? "Switch to dark mode"
            : "Switch to light mode"
        }
        title={
          theme === "light"
            ? "Switch to dark mode"
            : "Switch to light mode"
        }
      >
        <span>
          {theme === "light" ? "☾" : "☀"}
        </span>
      </button>

      <section
        className="landing-hero"
        style={{
          backgroundImage: `url(${cover || bgFallback})`,
        }}
      >
        <div className="hero-overlay"></div>

        <div className="hero-content">
          <div className="hero-brand">
            <div className="hero-logo">AG</div>

            <div>
              <strong>AGRIhelp</strong>

              <small>
                Agricultural Request and Information Management System
              </small>
            </div>
          </div>

          <div className="hero-text">
            <span className="hero-label">
              AGRICULTURAL SERVICE MANAGEMENT
            </span>

            <h1>
              Connecting agricultural communities with better services.
            </h1>

            <p>
              AGRIhelp provides a centralized platform for managing
              agricultural requests, required documents, validation
              activities, and appointments.
            </p>

            <button
              type="button"
              className="hero-login-button"
              onClick={scrollToLogin}
            >
              Login to AGRIhelp
            </button>
          </div>

          <div className="scroll-indicator">
            <b>↓</b>
            <span>Scroll to explore</span>
          </div>
        </div>
      </section>

      <section
        className="landing-login-section"
        id="login-section"
      >
        <div className="landing-login-wrapper">
          <div className="login-introduction">
            <span className="section-label">
              
            </span>

            <h2>
              Manage agricultural requests in one place.
            </h2>

            <p>
              Login to access your AGRIhelp account and manage your
              agricultural requests, documents, schedules, and other
              services provided by the office.
            </p>

            <div className="login-info-list">
              <div>
                <span>✓</span>
                <p>Submit and monitor agricultural requests</p>
              </div>

              <div>
                <span>✓</span>
                <p>Upload and manage required documents</p>
              </div>

              <div>
                <span>✓</span>
                <p>Track request and document status</p>
              </div>

              <div>
                <span>✓</span>
                <p>View validation appointments and schedules</p>
              </div>
            </div>
          </div>

          <div className="login-form-card">
            {!firebaseConfigured && (
              <div className="login-error">
                Firebase is not configured yet. Login and database
                features will not work until Firebase is configured.
              </div>
            )}

            <div className="login-form-header">
              <div className="login-form-logo">AG</div>

              <div>
                <h2>Sign in</h2>
                <p>Access your AGRIhelp account</p>
              </div>
            </div>

            <form onSubmit={handleLogin}>
              <label htmlFor="login-email">
                Email Address
              </label>

              <input
                id="login-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                autoComplete="email"
              />

              <label htmlFor="login-password">
                Password
              </label>

              <div className="password-wrapper">
                <input
                  id="login-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value
                    )
                  }
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>

              {error && (
                <div className="login-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="login-submit-button"
              >
                Login
              </button>
            </form>

            <div className="login-register">
              <span>
                Don't have a client account?
              </span>

              <button
                type="button"
                onClick={() =>
                  navigate("/signup")
                }
              >
                Create a Client Account
              </button>

              <span>
                Engineer account
              </span>

              <button
                type="button"
                onClick={() =>
                  navigate("/engineer-signup")
                }
              >
                Create an Engineer Account
              </button>
            </div>

            <div className="login-office">
              {OFFICE_NAME}
            </div>
          </div>
        </div>
      </section>

      <section className="welcome-purpose-section">
        <div className="welcome-purpose">
          <h2>
            WELCOME TO AGRIhelp
          </h2>

          <h2>
            A better way to manage agricultural services.
          </h2>

          <p>
            AGRIhelp helps agricultural clients and engineering
            personnel organize requests, documents, validation
            activities, and appointments through one centralized
            system.
          </p>
        </div>
      </section>

      <section className="mission-vision-section">
        <div className="landing-section-heading">
          <span className="section-label">
            OUR PURPOSE
          </span>

          <h2>
            Mission and Vision
          </h2>

          <p>
            AGRIhelp is designed to support efficient and organized
            agricultural service delivery.
          </p>
        </div>

        <div className="mission-vision-grid">
          <article className="mission-card">
            <div className="mission-card-icon">
              🌱
            </div>

            <span className="card-label">
              OUR MISSION
            </span>

            <h3>
              Serving agricultural communities efficiently.
            </h3>

            <p>
              TO LIVE AND UPHOLD THE VALUES OF RESPECT FOR GOD,
              HUMAN LIFE AND DIGNITY, THE ENVIRONMENT, AND ITS
              HERITAGE, TO PROMOTE INTEGRITY IN PUBLIC SERVICE
              THAT WILL HELP TO TRANSFORM BULAN INTO EMPOWERED,
              PEACEFUL, PROSPEROUS, RESILIENT AND
              INVESTMENT-FRIENDLY COMMUNITY.
            </p>
          </article>

          <article className="vision-card">
            <div className="mission-card-icon vision-card-icon">
              🌾
            </div>

            <span className="card-label">
              OUR VISION
            </span>

            <h3>
              A more connected agricultural service.
            </h3>

            <p>
              A PREMIER INVESTMENT CENTRE WITH EMPOWERED AND
              RESILIENT COMMUNITY. PROGRESS ECONOMY,
              SUSTAINABLE ENVIRONMENT AND PRESERVED HERITAGE
              ANCHORED ON TRANSFORMATIONAL AND RESPONSIVE
              GOVERNANCE.
            </p>
          </article>
        </div>
      </section>

      <section className="agri-gallery-section">
        <div className="landing-section-heading gallery-heading">
          <span className="section-label">
            AGRICULTURAL SERVICES
          </span>

          <h2>
            Supporting Our Agricultural Communities
          </h2>

          <p>
            Explore the agricultural activities and communities
            that AGRIhelp aims to support.
          </p>
        </div>

        <div className="agri-gallery">
          <article className="gallery-item gallery-large">
            <img
              src={agriPhoto1}
              alt="Agricultural field"
            />

            <div className="gallery-caption">
              <span>
                Agricultural Development
              </span>

              <p>
                Supporting agricultural communities through
                organized and accessible services.
              </p>
            </div>
          </article>

          <article className="gallery-item">
            <img
              src={agriPhoto2}
              alt="Agricultural activity"
            />

            <div className="gallery-caption">
              <span>
                Community Support
              </span>

              <p>
                Connecting agricultural communities with the
                services they need.
              </p>
            </div>
          </article>

          <article className="gallery-item">
            <img
              src={agriPhoto3}
              alt="Agricultural field work"
            />

            <div className="gallery-caption">
              <span>
                Field Services
              </span>

              <p>
                Helping improve agricultural processes and
                field-related services.
              </p>
            </div>
          </article>

          <article className="gallery-item">
            <img
              src={agriPhoto4}
              alt="Agricultural community"
            />

            <div className="gallery-caption">
              <span>
                Agricultural Community
              </span>

              <p>
                Helping connect agricultural communities with
                better service coordination.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="about-agrihelp-section">
        <div className="about-agrihelp">
          <div className="about-number">
            01
          </div>

          <div>
            <span className="section-label">
              ABOUT AGRIhelp
            </span>

            <h2>
              A centralized platform for agricultural request
              management.
            </h2>

            <p>
              AGRIhelp is a web-based system designed to help
              agricultural clients and engineers manage requests,
              documents, validation activities, and appointments
              in a more organized way.
            </p>

            <p>
              Instead of relying on disconnected paperwork and
              manual coordination, the system provides a central
              location where users can submit information, monitor
              request progress, and coordinate with the responsible
              agricultural engineering personnel.
            </p>
          </div>
        </div>
      </section>

      <section className="final-login-section">
        <span className="section-label">
          READY TO GET STARTED?
        </span>

        <h2>
          Access AGRIhelp today.
        </h2>

        <p>
          Login to your account or create a client account to
          begin using the system.
        </p>

        <button
          type="button"
          className="hero-login-button"
          onClick={scrollToLogin}
        >
          Login Now
        </button>
      </section>

      <footer className="landing-footer">
        <div>
          <strong>AGRIhelp</strong>

          <span>
            Agricultural Request and Information Management System
          </span>
        </div>

        <p>
          © {new Date().getFullYear()} AGRIhelp. All rights reserved.
        </p>
      </footer>
    </main>
  );
}