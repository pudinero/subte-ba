// @ts-check
import { defineConfig, fontProviders } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

import netlify from "@astrojs/netlify";

import preact from "@astrojs/preact";

// https://astro.build/config
export default defineConfig({
  adapter: netlify(),

  vite: {
    plugins: [tailwindcss()],
  },

  fonts: [
    {
      provider: fontProviders.google(),
      name: "Inter",
      cssVariable: "--font-inter",
    },
    {
      provider: fontProviders.google(),
      name: "Geist",
      cssVariable: "--font-geist",
    },
    {
      provider: fontProviders.google(),
      name: "Radio Canada Big",
      cssVariable: "--font-radio-canada-big",
    },
    {
      provider: fontProviders.google(),
      name: "Bricolage Grotesque",
      cssVariable: "--font-bricolage-grotesque",
    },
    {
      provider: fontProviders.adobe({ id: "uhp4pcp" }),
      name: "Neue Frutiger World",
      cssVariable: "--font-neue-frutiger",
    }
  ],

  integrations: [preact()],
});