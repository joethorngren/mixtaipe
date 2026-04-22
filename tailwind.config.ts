import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["Courier New", "Courier", "monospace"],
        pixel: ['"MS Sans Serif"', "Tahoma", "sans-serif"],
      },
      colors: {
        // Y2K palette
        teal98: "#008080",
        silver98: "#c0c0c0",
        ink98: "#000080",
        yellowCd: "#ffff00",
        limewire: "#7fff00",
        napster: "#ffcc00",
      },
    },
  },
  plugins: [],
};

export default config;
