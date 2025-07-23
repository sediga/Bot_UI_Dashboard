import { useEffect, useState } from "react";

const totalSlides = 13;
const slides = Array.from({ length: totalSlides }, (_, i) =>
  `/assets/slides/onboard/basic_flow/botflows${i + 2}.png`
);

const FeatureCarousel = () => {
  const [current, setCurrent] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
const VideoModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="relative w-[90%] max-w-4xl bg-white rounded-lg shadow-xl">
        <video
          className="w-full h-auto rounded-t-lg"
          controls
          autoPlay
        >
          <source
            src="/assets/slides/onboard/basic_flow/botflows_demo.mp4"
            type="video/mp4"
          />
          Your browser does not support the video tag.
        </video>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
};

  // ✅ Autoplay every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (showVideo) return;
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [showVideo]);

  return (
    <div className="w-full h-[52vh]  flex flex-col justify-between">
      <div className="relative w-full h-[48vh] flex flex-col justify-between overflow-hidden group">
        <img
          src={slides[current]}
          alt={`Slide ${current + 1}`}
          className="w-full h-[48vh] object-contain mx-auto transition duration-300"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition duration-300 flex items-center justify-center">
          <div
            onClick={() => {
              console.log("Overlay clicked");
              setShowVideo(true);
            }}
            className="text-white text-2xl font-semibold underline opacity-0 group-hover:opacity-100 transition cursor-pointer"
          >
            🔍 See Demo
          </div>
        </div>

        {/* Arrows */}
        <button
          onClick={() => setCurrent((current - 1 + slides.length) % slides.length)}
          className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-white bg-opacity-70 hover:bg-opacity-100 text-gray-800 px-3 py-1 rounded shadow"
        >
          ‹
        </button>
        <button
          onClick={() => setCurrent((current + 1) % slides.length)}
          className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-white bg-opacity-70 hover:bg-opacity-100 text-gray-800 px-3 py-1 rounded shadow"
        >
          ›
        </button>
      </div>

      {/* Dots */}
      <div className="flex flex-col items-center mt-2">
        <div className="flex justify-center space-x-1">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`w-3 h-3 rounded-full ${
                i === current ? "bg-indigo-600" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
        <p className="text-[12px] leading-none text-gray-500 mt-2 m-0">
          Step {current + 1} of {slides.length}
        </p>
      </div>
      {/* ✅ This will show the modal when showVideo is true */}
      {showVideo && <VideoModal isOpen={showVideo} onClose={() => setShowVideo(false)} />}
  </div>
  );
};

export default FeatureCarousel;
