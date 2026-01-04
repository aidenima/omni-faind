import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OmniFAIND",
    short_name: "OmniFAIND",
    description:
      "OmniFAIND is the AI sourcing and screening workspace for professional networks, talent hubs, and freelance marketplaces. Generate lead lists, qualify candidates, and run outreach faster.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#0f172a",
    background_color: "#020617",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
