import { useState } from "react";
import slides from "./slides.json"; // External JSON below for clean use
// import FeatureCarousel from "./FeatureCarousel";

const FeatureCarousel = () => {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((current - 1 + slides.length) % slides.length);
  const next = () => setCurrent((current + 1) % slides.length);

  return (
    <div className="w-full max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="relative">
        <div className="h-[320px] overflow-hidden flex items-center justify-center bg-gray-100">
          <img
            src={`/assets/slides/${slides[current].file}`}
            alt={slides[current].caption}
            className="w-full h-auto max-h-[420px] object-contain mx-auto"
          />
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-sm py-2 px-4">
              {slides[current].caption}
            </div>
            <button
              onClick={prev}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white px-3 py-1"
            >
              ‹
            </button>
            <button
              onClick={next}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white px-3 py-1"
            >
              ›
            </button>
        </div>
      </div>
    </div>
  );
};

export default FeatureCarousel;
