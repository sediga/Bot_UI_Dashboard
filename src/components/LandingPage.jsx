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

      </SectionWithBackground>
      <Footer />
    </div>
  );
};

export default Landing;
