import { Link } from "react-router-dom";
import FeatureCarousel from "./demo/FeatureCarousel";
import LaunchSections from "./LaunchSections";
import SectionWithBackground from "./SectionWithBackground";
import TopBanner from "./TopBanner";
import Footer from "./Footer"; 

const Landing = () => {
  return (
    <div className="bg-white min-h-screen w-full">
      {/* Hero Banner */}
      <SectionWithBackground>
        <TopBanner hideRibbon={false} />

        <LaunchSections />

      </SectionWithBackground>
      <Footer />
    </div>
  );
};

export default Landing;
