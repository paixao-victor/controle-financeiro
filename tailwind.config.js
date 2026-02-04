/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                "primary": "#47f425",
                "primary-dark": "#36d61b",
                "secondary": "#121811",
                "brand-green": "#f5f105ff",
                "background-light": "#f6f8f5",
                "background-dark": "#132210",
                "surface-light": "#ffffff",
                "surface-dark": "#1a2c15",
                "sidebar-light": "#ffffff",
                "sidebar-dark": "#162613",
                "expense": "#ef4444",
            },
            fontFamily: {
                "display": ["Manrope", "sans-serif"],
                "sans": ["Manrope", "sans-serif"],
            },
            borderRadius: {
                "4xl": "2rem",
            },
            boxShadow: {
                'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
                'glow': '0 0 15px rgba(71, 244, 37, 0.3)',
                'up': '0 -4px 20px -2px rgba(0, 0, 0, 0.05)',
                'nm-flat': '6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light)',
                'nm-inset': 'inset 3px 3px 7px var(--shadow-dark), inset -3px -3px 7px var(--shadow-light)',
            },
            keyframes: {
                "fade-up": {
                    "0%": { opacity: "0", transform: "translateY(20px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" }
                }
            },
            animation: {
                "fade-up": "fade-up 0.5s ease-out forwards"
            }
        },
    },
    plugins: [],
}
