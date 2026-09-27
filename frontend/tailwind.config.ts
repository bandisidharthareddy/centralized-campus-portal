import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#12121A",
        surface: "#28283E",    
        primary: "#FF2D78",    
        secondary: "#00FFCC",  
        tertiary: "#FFE04A",   
      },
    },
  },
  plugins: [],
};
export default config;