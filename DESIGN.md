---
name: AIAgent
description: A calm workspace for deliberate paper-trading practice.
colors:
  paper: "#f7f8f4"
  white: "#fff"
  ink: "#182e29"
  muted: "#5c6b65"
  green: "#23664b"
  mint: "#edf4eb"
  red: "#ac413b"
  line: "#e1e7df"
  accent: "#d8ec9e"
  sidebar: "#eef1ea"
  navigation-active: "#dde7d6"
  navigation-hover: "#e2e9dd"
  stock-selected: "#f0f5e9"
  stock-border: "#99af8c"
  stock-hover: "#e7efdf"
  notice: "#eef2e8"
  notice-text: "#4d614c"
  waiting: "#f2eee2"
  waiting-text: "#6b5625"
  check-neutral: "#f2f3ef"
  field-border: "#cbd4c7"
  coach-text: "#4f6157"
  tag-border: "#c8d2c5"
  avatar-border: "#bdcdbb"
  breadcrumb-divider: "#8e9c92"
  scrollbar: "#a2b6a6"
typography:
  headline:
    fontFamily: "DM Sans Variable, Segoe UI, sans-serif"
    fontSize: "clamp(25px, 2.35vw, 36px)"
    fontWeight: 550
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  title:
    fontFamily: "DM Sans Variable, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  body:
    fontFamily: "DM Sans Variable, Segoe UI, sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
  button:
    fontFamily: "DM Sans Variable, Segoe UI, sans-serif"
    fontSize: "12px"
  account-value:
    fontFamily: "DM Sans Variable, Segoe UI, sans-serif"
    fontSize: "23px"
    fontWeight: 550
    letterSpacing: "-0.025em"
  label:
    fontFamily: "DM Sans Variable, Segoe UI, sans-serif"
    fontSize: "11px"
rounded:
  tag: "4px"
  field: "5px"
  control: "6px"
  navigation: "7px"
  brand: "8px"
  panel: "12px"
  circle: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  panel: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "11px 16px"
  button-primary-hover:
    backgroundColor: "{colors.green}"
  button-text:
    textColor: "{colors.green}"
    typography: "{typography.label}"
    padding: "4px 0"
  risk-select:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.field}"
    padding: "{spacing.md}"
    width: "100%"
  navigation-active:
    backgroundColor: "{colors.navigation-active}"
    textColor: "{colors.ink}"
    rounded: "{rounded.navigation}"
    padding: "{spacing.md}"
  status-waiting:
    backgroundColor: "{colors.waiting}"
    textColor: "{colors.waiting-text}"
    rounded: "{rounded.tag}"
    padding: "5px 8px"
  status-qualified:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.green}"
    rounded: "{rounded.tag}"
    padding: "5px 8px"
  panel:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.panel}"
  coach-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "{spacing.md}"
    width: "100%"
  coach-topic-selected:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px"
  stock-selected:
    backgroundColor: "{colors.stock-selected}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
---

# Design System: AIAgent

## Overview

A light, calm learning workspace places market evidence alongside an explicit risk plan. Compact labels and generous panel separation support deliberate reading; a single dark action button anchors each task. This document describes the implemented Next.js prototype. Frontmatter tokens are normative; component and responsive details extend them below.

Key characteristics:
- Paper-colored canvas, white analytical panels, and muted green navigation.
- A large chart with visible setup conditions and an adjacent risk ticket.
- Persistent synthetic-data disclosure and plain-language teaching copy.

## Colors

Ink supplies primary text and action surfaces. Green identifies positive values and passed conditions; red identifies negative values, falling candles, and errors. These meanings are also expressed through labels, symbols, or values. Mint supports qualified states, while warm waiting tones mark incomplete conditions. Accent is reserved for the brand mark, coach icon, and text selection. Paper, white, and line organize the neutral surfaces; the remaining frontmatter colors describe observed component states.

## Typography

The interface uses self-hosted DM Sans Variable with Segoe UI and sans-serif fallbacks. The headline has a compact line height and slight negative tracking; section titles use a stronger weight. Dense controls and explanatory labels sit below the body scale. Account values, prices, chart labels, and trade figures use tabular numerals where declared in the stylesheet. Guide paragraphs use a 70ch maximum measure and 1.8 line height. At the smallest breakpoint, the main heading is 30px and chart labels increase within the SVG coordinate system for legibility.

## Layout

Desktop uses a sticky 222px sidebar and a main container capped at 1500px. The header is 74px tall; main padding is 36px 38px 18px. The practice grid pairs a flexible chart column with a minimum 280px risk ticket at a 1.85:1 ratio and 24px gap. Account metrics form four columns above the grid. Panels generally use 24px inset spacing; the trade ticket uses 23px.

At 1200px and below, the sidebar is 185px, content gutters become 24px, and the grid tightens. At 900px and below, the sidebar is a 76px rail with visible compact navigation labels, and the ticket stacks below the chart and conditions. At 560px and below, navigation becomes a horizontal top bar, main gutters become 16px, account metrics use two columns, and secondary condition-result labels disappear. The journal table scrolls horizontally. At 1600px and above, the grid gap grows to 30px and main top padding to 50px.

The coach workspace uses two white panels in a 1:1.5 grid with a 260px minimum evidence column and a 24px gap. It stacks at 1100px; at 560px, panels use 20px 16px padding and a 16px gap. The journal review pairs original reasoning with a reflection form and stacks at 760px. Mobile navigation wraps to accommodate the additional section.

## Elevation & Depth

There are no shadows. White panels, tinted navigation and status backgrounds, and single-pixel borders create depth. Dividers separate replay controls, sizing, and coaching content without introducing nested elevated cards.

## Shapes

Panels have 12px corners; primary buttons and stock selectors have 6px corners. Fields and notices use 5px corners, status badges use 4px, navigation uses 7px, and the brand mark uses 8px. Circular dots and checks communicate state alongside readable text. Panel contents clip to their rounded boundary.

## Components

- **Buttons:** Dark ink primary actions use white text, 11px 16px padding, and a green hover state. Text actions are green and underlined. Disabled buttons use 0.46 opacity and a not-allowed cursor. Color changes take 160ms with ease-out timing; reduced-motion preferences remove transitions and animations.
- **Fields:** The risk selector uses paper fill, a subtle border, and 12px padding. Buttons, links, and selects share a 3px green focus outline with 4px offset.
- **Navigation:** Practice, Journal, Learning guide, and the coach share icon-and-label controls. The active item has a muted green fill and stronger text. Small layouts retain labels; the journal count is hidden below 900px.
- **Stock selectors and status badges:** Selected stocks use a tinted fill and explicit border, plus `aria-pressed`. Waiting and qualified badges pair distinct colors with text. Stocks other than the open position's symbol are disabled while a position is open.
- **Panels:** White surfaces with line-colored borders contain the chart, risk plan, journal, and guide. Each panel groups a coherent task; headings and dividers provide internal hierarchy.
- **Market replay:** Candles and volume bars reveal one step at a time. Stop and target levels appear as labeled dashed lines for an open position. The setup checklist explains trend, breakout, and volume conditions. The risk ticket switches to position details after entry, and the journal supplies a guided empty state before any completed trade.
- **Feedback:** A polite live region announces actions. Form validation errors use an alert. Reset requires a second explicit confirmation and exposes a cancel action.

- **Trading coach:** The evidence desk uses deterministic calculations. Topic buttons expose selection with `aria-pressed`. The adjacent plan form groups a numbered Plan → Practice → Review sequence, risk figures, three native checkboxes, written reasoning, and an explicit paper-entry action. An open position replaces the entry form with its saved plan and management link.
- **Learning fields:** Reasoning and reflection textareas use paper fill, a 1px field border, 6px corners, 12px padding, and a 105px minimum height. Labels precede fields; validation feedback is announced with an alert and clears when the input changes. Native checkboxes use the green accent and a visible focus ring.
- **Journal review:** A summary counts plans and reflections separately from outcomes. The trade table has a 650px minimum width and an explicitly labeled, focusable horizontal scroll region on small screens. Selecting a trade exposes its original reasoning and editable reflection; saved status uses a live region. Written text wraps without truncation.

## Do's and Don'ts

- Do preserve the order of evidence, conditions, risk planning, and reflection when adapting layouts.
- Do keep synthetic replay and paper-only status visible and describe signals as rule-based teaching examples.
- Do retain keyboard focus, visible navigation labels, and text equivalents for status colors.
- Do keep risk, estimated fees, and position size close to the order action.
- Don't present synthetic outcomes as live-market accuracy, AI predictions, or guaranteed income.
- Don't add urgency or autoplay to the deliberate one-candle replay interaction.
