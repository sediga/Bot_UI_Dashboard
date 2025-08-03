import TopBanner from "../components/TopBanner";
import Footer from "../components/Footer";
import SectionWithBackground from "../components/SectionWithBackground";

const PrivacyPolicy = () => (
  <div className="flex flex-col min-h-screen">

    <main className="flex-grow">
      <SectionWithBackground>
    <TopBanner />
        <div className="w-full px-6 py-4 text-gray-700">
          <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-xl font-semibold">Privacy Policy</h1>
            <p>Last updated: August 3, 2025</p>

            <p>
              Flowtra is currently offered as a free tool for automating web workflows. We respect your privacy and aim to collect as little information as possible.
            </p>

            <h2 className="font-medium">What We Collect</h2>
            <p>
              Flowtra does not collect or store any personal information beyond your email address for login purposes. Any automation flows you create are securely saved in our cloud infrastructure and are only accessible by you.
            </p>

            <h2 className="font-medium">Third-Party Services</h2>
            <p>
              Flowtra may interact with websites and services as part of the automation process, but it does not transmit or share your data with third parties.
            </p>

            <h2 className="font-medium">Data Responsibility</h2>
            <p>
            Flowtra is designed to support automation in a variety of industries, including healthcare and other regulated environments. While Flowtra does not store the actual data entered or viewed during automation, users may choose to record flows that interact with systems containing sensitive or protected information.
            </p>
            <p>
            It is the user's responsibility to ensure that their use of Flowtra complies with all applicable laws and regulations, including those related to the handling of protected health information (PHI), personal data, or other sensitive content. Flowtra does not monitor or validate the data processed during automation flows.
            </p>

            <h2 className="font-medium">Changes</h2>
            <p>
              This policy may be updated as we evolve. We’ll update this page if that happens.
            </p>

            <p>
              For any questions, contact us at{" "}
              <a
                href="mailto:support@flowtra.app"
                className="text-blue-600 hover:underline"
              >
                support@flowtra.app
              </a>.
            </p>
          </div>
        </div>
        <Footer  className="text-gray-500 text-sm py-6 pb-10 border-t-4 mt-10"/>
      </SectionWithBackground>
    </main>

  </div>
);

export default PrivacyPolicy;
