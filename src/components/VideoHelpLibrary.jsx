import React from "react";

const videos = [
  {
    id: "signup",
    title: "Getting Started: Sign Up and First Flow",
    url: "https://www.youtube.com/embed/qIYDk1huaKE",
    length: "~3 min",
    description:
      "Signing up, creating your first Flow, and overview of the dashboard."
  },
  {
    id: "overview",
    title: "Flowtra Overview – CSV → Forms → Export",
    url: "https://www.youtube.com/embed/OJbDHkbgy_s",
    length: "~3 min",
    description:
      "End-to-end demo: import a CSV, loop over rows, search NPI, extract grid data and export."
  },
  {
    id: "gridExtract",
    title: "Smart Step: Grid Extract",
    url: "https://www.youtube.com/embed/M9YXo32YwmQ",
    length: "~4 min",
    description:
      "How to pick a grid, choose columns, and let Flowtra read tabular data safely and export."
  },
  {
    id: "apiExtract",
    title: "Smart Step: API Extract",
    url: "https://www.youtube.com/embed/crZ40ebfJGA",
    length: "~3 min",
    description:
      "Use API-based data sources instead of UI scraping, and feed them into loops."
  },
  {
    id: "npiSearchAndExtract",
    title: "Automating NPI & Portal Workflows",
    url: "https://www.youtube.com/embed/_Nf64ecPV0s",
    length: "~3 min",
    description:
      "Step-by-step demos showing how Flowtra turns repetitive NPI lookups and portal workflows into reliable browser automations. Watch how we import CSVs, loop through NPIs, extract provider details, export clean datasets, and plug them back into your own systems."
  },
  // add more videos here as you publish them
];

export default function VideoHelpLibrary() {
  return (
    <section id="video-help" className="mt-16">
      <h2 className="text-2xl font-semibold tracking-tight mb-2">
        Video Help Library
      </h2>
      <p className="text-sm text-gray-600 mb-6 max-w-2xl">
        Short walkthroughs for the most common Flowtra scenarios. Start with the overview,
        then dive into individual smart steps.
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        {videos.map((video) => (
          <article
            key={video.id}
            className="rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white"
          >
            <div className="aspect-video w-full overflow-hidden rounded-t-2xl">
              <iframe
                className="w-full h-full"
                src={video.url}
                title={video.title}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-4">
              <h3 className="font-medium text-base mb-1">{video.title}</h3>
              {video.length && (
                <p className="text-xs text-gray-500 mb-1">
                  Length: {video.length}
                </p>
              )}
              {video.description && (
                <p className="text-xs text-gray-600">{video.description}</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
