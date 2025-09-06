import TopBanner from "../components/TopBanner";
import Footer from "../components/Footer";
import SectionWithBackground from "../components/SectionWithBackground";

const TermsOfUse = () => (
<div style={{ paddingTop: "var(--header-offset)" }}>  
    <div className="flex flex-col ">
    <main className="flex-grow">
  <SectionWithBackground>
    {/* <div className="flex flex-col min-h-screen text-sm text-gray-700"> */}
      {/* Header */}

      {/* Main content that pushes footer down */}
      <TopBanner />
      <div className="flex-grow w-full px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-xl font-semibold">Terms of Use</h1>
          <p>Last updated: August 3, 2025</p>

          <p>
            Flowtra is provided as a free service to help users automate browser-based workflows.
            By accessing or using the app, you agree to the following terms.
          </p>

          <h2 className="font-medium">No Warranty</h2>
          <p>
            Flowtra is offered “as-is” with no guarantees of uptime, accuracy, or reliability.
            We are not responsible for any damages, data loss, or interruptions caused by use of the tool.
          </p>

            <h2 className="font-medium">Acceptable Use</h2>
            <p>
            You agree not to use Flowtra for any unlawful, malicious, or unauthorized activities. This includes—but is not limited to—automating access to websites or systems in ways that violate their terms of service, privacy policies, or legal requirements.
            </p>
            <p>
            You are solely responsible for ensuring that your use of Flowtra complies with all applicable laws, regulations, and the terms of any third-party services you automate against, including those related to data privacy and the handling of sensitive information.
            </p>

          <h2 className="font-medium">Changes</h2>
          <p>
            These terms may change at any time. Continued use of the service means you accept the updated terms.
          </p>

          <p>
            For questions, contact us at{" "}
            <a
              href="mailto:support@flowtra.app"
              className="text-blue-600 hover:underline"
            >
              support@flowtra.app
            </a>.
          </p>
        {/* </div> */}
      </div>
    </div>
  </SectionWithBackground>
      {/* Footer row — override ONLY here to cancel its internal mt-10 */}
      <div className="[&>footer]:mt-0">
        <Footer />
      </div>
  </main>
  </div>
</div>
);

export default TermsOfUse;
