import Joyride from 'react-joyride';

const DashboardTour = ({ run, setRun }) => {
  const steps = [
    {
      target: ".installAgent",
      content: "You have to install agent, if you havent done so yet, Or start agent by launching it from programs!"
    },
    {
        target: ".installInfo",
        content: "Pay attention to this, very importent while installing"
    },
    {
      target: ".enterUrl",
      content: "Enter your URL and click recording"
    },
    {
      target: ".record",
      content: "Click here to record, and wait for new browser to open and navigate to your URL, If browser does not open, Please check your agent settings and test browser!"
    }
  ];

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      disableOverlayClose
      styles={{
        options: {
          zIndex: 10000,
        },
      }}
      callback={(data) => {
        if (data.status === 'finished' || data.status === 'skipped') {
          setRun(false);
          localStorage.setItem('botflows_tour_skipped', 'true');
        }
      }}
    />
  );
};
export default DashboardTour;