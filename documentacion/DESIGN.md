---
name: resger crm
colors:
  surface: '#f9f9ff'
  surface-dim: '#ccdaf8'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e8eeff'
  surface-container-high: '#dfe8ff'
  surface-container-highest: '#d6e3ff'
  on-surface: '#0d1c32'
  on-surface-variant: '#434656'
  inverse-surface: '#233148'
  inverse-on-surface: '#ecf0ff'
  outline: '#737688'
  outline-variant: '#c3c5d9'
  surface-tint: '#004ced'
  primary: '#003ec7'
  on-primary: '#ffffff'
  primary-container: '#0052ff'
  on-primary-container: '#dfe3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#006c4d'
  on-secondary: '#ffffff'
  secondary-container: '#2afdba'
  on-secondary-container: '#007150'
  tertiary: '#005471'
  on-tertiary: '#ffffff'
  tertiary-container: '#006e92'
  on-tertiary-container: '#c6eaff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001452'
  on-primary-fixed-variant: '#0038b6'
  secondary-fixed: '#40ffbe'
  secondary-fixed-dim: '#00e1a4'
  on-secondary-fixed: '#002115'
  on-secondary-fixed-variant: '#005139'
  tertiary-fixed: '#c2e8ff'
  tertiary-fixed-dim: '#75d1ff'
  on-tertiary-fixed: '#001e2b'
  on-tertiary-fixed-variant: '#004d67'
  background: '#f9f9ff'
  on-background: '#0d1c32'
  surface-variant: '#d6e3ff'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  gutter: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 2.5rem
---

## Brand & Style

This design system is engineered for efficiency, precision, and high-tech sophistication. It caters to modern enterprises that require a robust yet intuitive interface to manage complex data. The aesthetic direction is **Corporate / Modern** with a slight **Glassmorphic** influence, emphasizing a "glass-and-steel" digital environment that feels premium and reliable.

The UI aims to evoke a sense of professional mastery. It balances the high-energy vibrancy of a tech startup with the grounded stability of a financial institution. High-density layouts are softened by refined transparency effects and purposeful use of gradients, ensuring the product feels advanced without becoming overwhelming.

## Colors

The palette is derived from the core identity of the product, utilizing a range of blues and teals to establish a "high-tech" atmosphere.

- **Primary Blue (#0052FF):** The core action color, used for primary buttons, active states, and critical brand moments. It represents energy and motion.
- **Secondary Teal (#00F2B0):** Used as a secondary accent and for "success" or "growth" indicators. It provides a refreshing contrast to the deep blues.
- **Tertiary Cyan (#00C2FF):** Employed in gradients and data visualization to bridge the gap between primary blue and teal.
- **Deep Navy (#001A41):** The foundation for text, dark mode backgrounds, and structural borders. It replaces pure black to maintain a sophisticated, tinted depth.
- **Neutral Greys:** A cool-toned scale (e.g., #F8FAFC to #64748B) is used for secondary text and surface containment.

## Typography

The typographic hierarchy utilizes three distinct families to balance readability with a technical edge.

- **Hanken Grotesk** is used for headlines. Its sharp, contemporary geometry reinforces the professional and modern brand personality.
- **Inter** handles all body copy. It is selected for its exceptional legibility in data-heavy CRM environments, ensuring clarity at all sizes.
- **JetBrains Mono** is reserved for metadata, labels, and numerical data. This monospaced choice highlights the "data-driven" nature of the platform and makes comparative values easier to read.

Maintain tight line heights for headlines to create a compact, modern look, while keeping body text open and legible.

## Layout & Spacing

The layout follows a **Fluid Grid** system designed to maximize information density without clutter.

- **Desktop:** 12-column grid with 24px (1.5rem) gutters and 40px (2.5rem) outer margins.
- **Tablet:** 8-column grid with 16px (1rem) gutters.
- **Mobile:** 4-column grid with 16px (1rem) gutters and margins.

Spacing follows a strict 4px base unit. Component internal padding should favor "md" (16px) for standard containers and "sm" (8px) for compact data rows. Use vertical rhythm to group related content, keeping the relationship between headers and their content tight.

## Elevation & Depth

This design system uses **Tonal Layers** combined with **Low-contrast Outlines** to create hierarchy. 

Shadows should be used sparingly. When used, they should be "Ambient Shadows"—highly diffused, using a deep navy tint (#001A41) at 8-12% opacity to ground elements without creating artificial "pop."

For high-priority overlays or sidebars, apply a subtle **Glassmorphism** effect: a backdrop blur of 12px with a white or navy stroke at 10% opacity. This creates a "heads-up display" (HUD) feel that suggests the interface is an advanced tool for data navigation.

## Shapes

The shape language is **Soft (0.25rem)**. This provides a professional, geometric feel that isn't as harsh as sharp corners but avoids the overly casual nature of fully rounded or pill-shaped designs.

Standard buttons and inputs use the base 4px (0.25rem) radius. Larger containers, such as dashboard cards, should scale up to `rounded-lg` (8px / 0.5rem) to provide a clear container hierarchy.

## Components

- **Buttons:** Primary buttons use a linear gradient from Primary Blue to Tertiary Cyan. Text is white, Hanken Grotesk Medium. Secondary buttons use a transparent background with a 1px solid Navy border.
- **Input Fields:** Use a subtle background fill (#F1F5F9 in light mode) and a 1px bottom border that transforms into a Primary Blue stroke on focus.
- **Chips:** Monospaced (JetBrains Mono) text inside small, low-contrast containers. Use Primary Blue or Secondary Teal for status indicators.
- **Cards:** Cards should have a 1px "ghost border" (#E2E8F0) and no shadow by default. On hover, apply an ambient shadow and a Primary Blue accent line on the left edge.
- **Data Tables:** High-density rows with `body-sm` typography. Alternate row colors using a faint tint of the primary color at 2% opacity to assist with eye-tracking.
- **Navigation:** Vertical sidebar using the Neutral Navy (#0A192F). Active items should be highlighted with a Secondary Teal glow or indicator.