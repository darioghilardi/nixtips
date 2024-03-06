const typography = require('@tailwindcss/typography')
const forms = require('@tailwindcss/forms')
const colors = require('tailwindcss/colors')
const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  content: ['./themes/nixtips/**/*.{html,js}'],
  plugins: [typography, forms],
  theme: {
    extend: {
      maxWidth: {
        '9xl': '96rem',
      },
      colors: {
        main: colors.slate[600],
      },
      fontFamily: {
        sans: ['Inter var', ...defaultTheme.fontFamily.sans],
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            p: { 'font-weight': '375' },
            a: {
              'font-weight': '375',
              'text-decoration-color': theme('colors.slate[300]'),
              'text-underline-offset': '2px',
              '&:hover': {
                color: theme('colors.sky[500]'),
              },
            },
          },
        },
        slate: {
          css: {
            '--tw-prose-body': theme('colors.slate[600]'),
            '--tw-prose-headings': theme('colors.slate[800]'),
            '--tw-prose-links': theme('colors.slate[900]'),
          },
        },
      }),
      animation: {
        ['infinite-slider']: 'infiniteSlider 30s linear infinite',
      },
      keyframes: {
        infiniteSlider: {
          '0%': { transform: 'translate(0)' },
          '100%': {
            transform: 'translate(calc(-50%))',
          },
        },
      },
    },
  },
}
