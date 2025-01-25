import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: {
          DEFAULT: "hsl(var(--foreground))", // Default text color (light mode)
          dark: "hsl(0, 0%, 100%)", // White text color for dark mode
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: {
            DEFAULT: "hsl(var(--sidebar-foreground))", // Default text color (light mode)
            dark: "hsl(0, 0%, 100%)", // White text color for dark mode
          },
          primary: {
            DEFAULT: "hsl(var(--sidebar-primary))",
            dark: "hsl(var(--sidebar-primary-dark))", // Dark mode primary color
          },
          "primary-foreground": {
            DEFAULT: "hsl(var(--sidebar-primary-foreground))",
            dark: "hsl(0, 0%, 100%)", // White text color for dark mode
          },
          accent: {
            DEFAULT: "hsl(var(--sidebar-accent))",
            dark: "hsl(var(--sidebar-accent-dark))", // Dark mode accent color
          },
          "accent-foreground": {
            DEFAULT: "hsl(var(--sidebar-accent-foreground))",
            dark: "hsl(0, 0%, 100%)", // White text color for dark mode
          },
          border: {
            DEFAULT: "hsl(var(--sidebar-border))",
            dark: "hsl(var(--sidebar-border-dark))", // Dark mode border color
          },
          ring: {
            DEFAULT: "hsl(var(--sidebar-ring))",
            dark: "hsl(var(--sidebar-ring-dark))", // Dark mode ring color
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;