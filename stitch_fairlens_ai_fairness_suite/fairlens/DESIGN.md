---
name: FairLens
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1c'
  surface-container: '#201f20'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353435'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c5c6ca'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8f9194'
  outline-variant: '#44474a'
  surface-tint: '#c4c7ca'
  primary: '#ffffff'
  on-primary: '#2d3134'
  primary-container: '#e0e2e6'
  on-primary-container: '#626568'
  inverse-primary: '#5c5f62'
  secondary: '#c0c7d3'
  on-secondary: '#2a313b'
  secondary-container: '#404752'
  on-secondary-container: '#afb5c2'
  tertiary: '#ffffff'
  on-tertiary: '#362f29'
  tertiary-container: '#ede0d6'
  on-tertiary-container: '#6c635b'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e0e2e6'
  primary-fixed-dim: '#c4c7ca'
  on-primary-fixed: '#191c1f'
  on-primary-fixed-variant: '#44474a'
  secondary-fixed: '#dce3f0'
  secondary-fixed-dim: '#c0c7d3'
  on-secondary-fixed: '#151c25'
  on-secondary-fixed-variant: '#404752'
  tertiary-fixed: '#ede0d6'
  tertiary-fixed-dim: '#d0c4bb'
  on-tertiary-fixed: '#211a15'
  on-tertiary-fixed-variant: '#4d453e'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353435'
typography:
  display-xl:
    fontFamily: Inter
    fontSize: 60px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: '0'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  2xl: 64px
  gutter: 24px
  margin: 32px
---

## Brand & Style

This design system is built on a "Cinematic Minimalist" aesthetic, blending the structured clarity of high-end productivity tools with the atmospheric depth of a modern startup. The brand personality is authoritative yet transparent, designed to evoke trust through precision.

The visual direction centers on **Glassmorphism**, utilizing layered translucency and subtle backdrop blurs to create a sense of physical depth. The atmosphere is further enhanced by a dynamic particle motif: neutral gray elements represent data in its raw state, transitioning into a vibrant red to signal algorithmic bias or a lush green to signify fairness and balance. The result is a UI that feels like a high-performance lens—focusing the user's attention on critical insights with surgical precision.

## Colors

The palette is rooted in deep obsidian tones to provide a high-contrast foundation for data visualization. 

- **Foundation:** The background uses a near-black obsidian, while surfaces transition to a deep navy-gray to create hierarchical separation.
- **Accents:** Color is used sparingly and functionally. **Bias Red** is reserved for critical alerts and inequity indicators. **Fair Green** signifies compliance and balanced data.
- **Translucency:** Use 1px borders with low-opacity white (10%) to define element boundaries without breaking the dark-mode immersion.

## Typography

This design system utilizes **Inter** for its utilitarian precision and exceptional readability in data-heavy environments. The hierarchy is intentionally dramatic; large, bold headlines create clear entry points, while body text remains breathable with generous line heights.

- **Headlines:** Use tight letter-spacing and heavy weights to create a "Stripe-like" premium feel.
- **Labels:** Use uppercase for small metadata or section headers to distinguish them from interactive body text.
- **Hierarchy:** Maintain a clear contrast between `Primary Text (#E5E7EB)` for headers and `Secondary Text (#9CA3AF)` for descriptions and captions.

## Layout & Spacing

The layout philosophy follows a **fixed-width container system** for content-heavy pages and a **12-column fluid grid** for analytical dashboards. 

- **Rhythm:** An 8px linear scale governs all padding and margin decisions, ensuring a consistent vertical rhythm.
- **White Space:** Embrace large `2xl` gaps between major sections to mimic the "Notion" minimalist aesthetic.
- **Margins:** Page layouts should maintain a minimum of 32px side margins on desktop to prevent content from feeling crowded against the screen edges.

## Elevation & Depth

Depth is communicated through **backlighting and frosted glass** rather than traditional drop shadows.

1.  **Level 0 (Base):** The #0B0F14 background.
2.  **Level 1 (Cards):** Surface color #111827 with a 1px `border-white/10` and a `backdrop-filter: blur(12px)`.
3.  **Level 2 (Modals/Popovers):** Higher transparency, increased blur (20px), and a soft, diffused shadow (`0px 20px 40px rgba(0,0,0,0.4)`).

Interactive elements should appear to "glow" or lift slightly when hovered, using a subtle increase in the internal border opacity.

## Shapes

The shape language is characterized by **xl rounded corners**, creating a soft, approachable container for technical data.

- **Standard Containers:** Use a 1.5rem (`rounded-xl`) radius for cards and main UI surfaces.
- **Interactive Elements:** Buttons and input fields should follow a 0.5rem (`rounded-md`) to 0.75rem (`rounded-lg`) radius to maintain a distinct "tool" feel within the softer layouts.
- **Consistency:** Never mix sharp corners with rounded ones; even the smallest tags should have a minimum of 4px rounding.

## Components

- **Buttons:** Primary buttons use a solid #E5E7EB background with dark text. Secondary buttons are ghost-styled with a 1px border and subtle hover fill.
- **Cards:** Incorporate a subtle gradient stroke (top-left to bottom-right) to catch the "light" and enhance the glass effect.
- **Inputs:** Dark backgrounds (#0B0F14) with a focus state that highlights the border in a neutral white/20, avoiding heavy glows.
- **Data Visuals:** Charts should utilize the particle system logic—dots and lines that transition color based on the status (Gray -> Red/Green).
- **Glass Chips:** Small, semi-transparent pills for status markers, using low-opacity versions of the Red and Green palette for background fills.
- **Bias Indicators:** Custom progress bars that shift color dynamically from the center outward, representing the "FairLens" focus.