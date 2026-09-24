import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import MoleculeInput from "../components/MoleculeInput";
import PredictionResult from "../components/PredictionResult";

function Prediction() {
  const navigate = useNavigate();

  const [predictionData, setPredictionData] = useState(null);

  const inputRef = useRef(null);
  const resultRef = useRef(null);

  const handlePrediction = (data) => {
    setPredictionData(data);

    setTimeout(() => {
      resultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  const handleBack = () => {
    if (predictionData) {
      setPredictionData(null);

      setTimeout(() => {
        inputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } else {
      navigate("/");
    }
  };

  const handleForward = () => {
    if (predictionData) {
      resultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <>
      <button className="back-button" onClick={handleBack}>
        ← Back
      </button>

      <button className="forward-button" onClick={handleForward}>
        Forward →
      </button>

      <div ref={inputRef}>
        <MoleculeInput onPredict={handlePrediction} />
      </div>

      {predictionData && (
        <div ref={resultRef}>
          <PredictionResult data={predictionData} />
        </div>
      )}
    </>
  );
}

export default Prediction;