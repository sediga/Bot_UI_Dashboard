import { Link } from "react-router-dom";
import FeatureCarousel from "./demo/FeatureCarousel";
import BetaLaunchSections from "./BetaLaunchSections";
import SectionWithBackground from "./SectionWithBackground";
import TopBanner from "./TopBanner";
import Footer from "./Footer"; 

const Landing = () => {
  return (
    <div className="bg-white min-h-screen w-full">
      {/* Hero Banner */}
<SectionWithBackground>
      <TopBanner/>

      {/* Carousel Section */}
      {/* <section className="bg-gray-50 py-12 px-4">
        <div className="w-full max-w-screen-xl mx-auto">
          <FeatureCarousel />
        </div>
      </section> */}

      {/* Smart Feature Sections */}
      {/* Beta Launch Sections */}
      <BetaLaunchSections />

      {/* Final CTA */}
      <section className="text-center py-12">
        <p className="text-xl text-gray-500 mb-2">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-indigo-600 underline hover:text-indigo-800">
            Create one now
          </Link>.
        </p>
      </section>
      </SectionWithBackground>
      <Footer />
    </div>
  );
};

export default Landing;
