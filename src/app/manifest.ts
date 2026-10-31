import type { MetadataRoute } from "next";

/** Web app manifest (B6): the emblem on phone home screens, in the flyer's colours. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Journal of Humanities and Transcultural Studies",
    short_name: "JHTS",
    description: "A peer-reviewed journal of the Use of English Unit, University of Nigeria, Nsukka.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7ee",
    theme_color: "#14452f",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
