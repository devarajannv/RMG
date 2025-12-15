# RMGaaS Brand Guidelines

> **Document Status:** APPROVED  
> **Last Updated:** 2025-12-15  
> **Version:** 1.0

---

## Brand Identity

### Company

| Attribute | Value |
|-----------|-------|
| **Company Name** | NewVision Software |
| **Tagline** | THINK FORWARD |
| **Product Name** | RMGaaS (Resource Management & Governance as a Service) |

### Logo

| Attribute | Value |
|-----------|-------|
| **Primary Logo** | `New-Vision-2023.png` |
| **Format** | PNG with transparent background |
| **Elements** | "NEW VISION" text + arrow icon + "THINK FORWARD" tagline |

### Logo Usage

```
┌─────────────────────────────────────────────┐
│  ╲╱                                         │
│  NEW         ←←←←←←                        │
│  VISION      ▶▶▶▶▶▶  (colorful arrow)      │
│  THINK FORWARD                              │
└─────────────────────────────────────────────┘
```

**Rules:**
- Maintain aspect ratio
- Minimum clear space: Height of "V" around all sides
- Minimum width: 120px
- Do not stretch, rotate, or modify colors

---

## Color Palette

### Primary Colors (from logo)

| Color | Hex | Usage |
|-------|-----|-------|
| **Charcoal Gray** | `#4a4a4a` | Primary text, logo text |
| **Medium Gray** | `#666666` | Secondary text |
| **Light Gray** | `#808080` | Tertiary text |

### Accent Colors (from logo arrow)

| Color | Hex | Usage |
|-------|-----|-------|
| **Deep Blue** | `#0077b6` | Primary actions, links |
| **Teal** | `#00b4d8` | Secondary accents |
| **Orange** | `#f77f00` | Alerts, warnings |
| **Yellow** | `#fcbf49` | Highlights |

### UI Colors

| Color | Hex | Usage |
|-------|-----|-------|
| **Background Primary** | `#ffffff` | Main background |
| **Background Secondary** | `#f8f9fa` | Cards, sections |
| **Background Tertiary** | `#e9ecef` | Disabled, dividers |
| **Border** | `#dee2e6` | Borders, separators |

### Semantic Colors

| Color | Hex | Usage |
|-------|-----|-------|
| **Success** | `#10b981` | Success states |
| **Warning** | `#f59e0b` | Warning states |
| **Error** | `#ef4444` | Error states |
| **Info** | `#3b82f6` | Info states |

---

## CSS Variables

```css
:root {
  /* Brand Colors */
  --brand-charcoal: #4a4a4a;
  --brand-gray-medium: #666666;
  --brand-gray-light: #808080;
  
  /* Accent Colors */
  --accent-blue: #0077b6;
  --accent-teal: #00b4d8;
  --accent-orange: #f77f00;
  --accent-yellow: #fcbf49;
  
  /* Background Colors */
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-tertiary: #e9ecef;
  
  /* Text Colors */
  --text-primary: #4a4a4a;
  --text-secondary: #666666;
  --text-muted: #808080;
  
  /* Semantic Colors */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
  
  /* Border */
  --border-color: #dee2e6;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}
```

---

## Typography

### Font Stack

| Usage | Font |
|-------|------|
| **Headings** | Inter (or system fallback) |
| **Body** | Inter (or system fallback) |
| **Monospace** | JetBrains Mono (or system monospace) |

### Font Sizes

| Size | Rem | Pixels | Usage |
|------|-----|--------|-------|
| xs | 0.75rem | 12px | Labels, captions |
| sm | 0.875rem | 14px | Body small |
| base | 1rem | 16px | Body |
| lg | 1.125rem | 18px | Body large |
| xl | 1.25rem | 20px | Heading 5 |
| 2xl | 1.5rem | 24px | Heading 4 |
| 3xl | 1.875rem | 30px | Heading 3 |
| 4xl | 2.25rem | 36px | Heading 2 |
| 5xl | 3rem | 48px | Heading 1 |

### Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| Normal | 400 | Body text |
| Medium | 500 | Emphasis |
| Semibold | 600 | Subheadings |
| Bold | 700 | Headings |

---

## Spacing

### Scale (Tailwind)

| Size | Rem | Pixels |
|------|-----|--------|
| 1 | 0.25rem | 4px |
| 2 | 0.5rem | 8px |
| 3 | 0.75rem | 12px |
| 4 | 1rem | 16px |
| 5 | 1.25rem | 20px |
| 6 | 1.5rem | 24px |
| 8 | 2rem | 32px |
| 10 | 2.5rem | 40px |
| 12 | 3rem | 48px |
| 16 | 4rem | 64px |

---

## Border Radius

| Size | Rem | Usage |
|------|-----|-------|
| sm | 0.125rem | Small elements |
| base | 0.25rem | Buttons, inputs |
| md | 0.375rem | Cards |
| lg | 0.5rem | Modals |
| xl | 0.75rem | Large cards |
| full | 9999px | Pills, avatars |

---

## Theme

### Mode

| Attribute | Value |
|-----------|-------|
| **Theme** | Light only (v1) |
| **Dark Mode** | Not supported initially |

### Guidelines

1. **Professional** - Enterprise SaaS aesthetic
2. **Clean** - Minimal visual noise
3. **No Gaudy Colors** - Muted, professional palette
4. **Information Dense** - Efficient use of space
5. **Accessible** - WCAG 2.1 AA compliant

---

## Component Styling

### Buttons

| Type | Background | Text | Border |
|------|------------|------|--------|
| Primary | `--accent-blue` | white | none |
| Secondary | transparent | `--accent-blue` | `--accent-blue` |
| Danger | `--color-error` | white | none |
| Ghost | transparent | `--text-primary` | none |

### Cards

| Property | Value |
|----------|-------|
| Background | `--bg-primary` |
| Border | 1px solid `--border-color` |
| Border Radius | md (0.375rem) |
| Shadow | `--shadow-sm` |

### Inputs

| State | Border | Background |
|-------|--------|------------|
| Default | `--border-color` | `--bg-primary` |
| Focus | `--accent-blue` | `--bg-primary` |
| Error | `--color-error` | `--bg-primary` |
| Disabled | `--border-color` | `--bg-tertiary` |

---

## Icons

| Library | Usage |
|---------|-------|
| **Lucide React** | Primary icon library |
| **Size** | 16px (sm), 20px (base), 24px (lg) |
| **Color** | Inherit from parent |

---

## Do's and Don'ts

### Do's ✅

- Use the defined color palette
- Maintain consistent spacing
- Keep UI clean and professional
- Use subtle shadows for depth
- Ensure text is readable (contrast)

### Don'ts ❌

- Don't use bright, gaudy colors
- Don't use excessive shadows
- Don't use inconsistent spacing
- Don't modify the logo colors
- Don't use decorative fonts
- Don't overcrowd interfaces

---

*Document created from strategic deliberation session on 2025-12-15*

