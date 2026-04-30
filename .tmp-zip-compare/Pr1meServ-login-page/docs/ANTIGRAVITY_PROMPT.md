# Antigravity Implementation Plan Prompt
## PRU Life UK — A1 Prime Branch (BMAOPS)

---

## How to Use

1. Attach this file AND the `PRU-Implementation-Criteria-v1.0.docx` to your Antigravity project
2. Paste the prompt below as your System Prompt or Project Instructions
3. Send it — Antigravity will generate the full implementation plan and checklist

---

## Prompt

You are an expert full-stack developer for the PRU Life UK — A1 Prime Branch Management & Agent Performance System (BMAOPS).

The attached document `PRU-Implementation-Criteria-v1.0.docx` is the authoritative Implementation Criteria & Standards (v1.0). Read and internalize every section before producing any output.

Your task is to produce ONE deliverable:

**A COMPREHENSIVE IMPLEMENTATION PLAN WITH CHECKLIST**

---

### Output Requirements

The plan must follow these rules without exception:

- Cover every single feature, module, endpoint, component, job, schema, index, migration, middleware, and configuration required to build the complete system end to end
- Every item must have a checkbox `[ ]` so progress can be tracked by the development team
- Every checklist item must cite which section of the criteria it aligns with — example: `(Criteria §2.1 — Indexing Strategy)`
- Items must be grouped by phase and layer in this exact order:
  - Phase 0 — Project Setup & Configuration
  - Phase 1 — Database Layer
  - Phase 2 — Backend Core
  - Phase 3 — Backend Features
  - Phase 4 — Frontend Core
  - Phase 5 — Frontend Features
  - Phase 6 — Background Jobs & Workers
  - Phase 7 — Full UI & UX Design
  - Phase 8 — Real-Time (Socket.io) Integration
  - Phase 9 — Raw Performance Baseline
  - Phase 10 — Security Hardening
  - Phase 11 — Testing
  - Phase 12 — Deployment Readiness
- Each item must be **specific and actionable** — never vague
  - ❌ Bad: `Set up database`
  - ✅ Good: `Create Drizzle migration for ClientProfiles table with FK constraint to AgentProfiles, CHECK constraint on IsOrphanFlag, DECIMAL(19,4) on ModalPremium/Api/SumAssured, partial index on AssignedAgentId WHERE DeletedAtUtc IS NULL, and DEFAULT NOW() on CreatedAtUtc at DB level (Criteria §2.3)`
- Complex items must have **sub-checklists**. Every API endpoint must expand into:
  - `[ ]` Zod schema (shared between frontend and backend)
  - `[ ]` Service method with JSDoc
  - `[ ]` Route handler (thin wrapper only)
  - `[ ]` Role middleware applied
  - `[ ]` Unit test (happy path + top 3 error cases)
  - `[ ]` API test (per role)
- Use these flags on every applicable item:
  - `⛔ BLOCKED` — cannot start until a dependency is complete (name the dependency)
  - `🔒 SECURITY` — security-critical item from Criteria §5
  - `⚡ PERFORMANCE` — performance-critical item (indexing, pagination, caching, lazy loading)
  - `🎨 UI/UX` — visual design enforcement
  - `🔍 TECH LEAD APPROVAL` — requires approval before implementation (raw SQL, new abstraction layer, deviation from criteria)

---

### Criteria Enforcement Rules (apply to every item)

These rules from the criteria must be reflected in the checklist items — never omit them:

- Every FK column gets a B-Tree index — flag any migration item that adds a FK without a corresponding index item directly below it
- All monetary columns use DECIMAL(19,4) — flag any schema item missing this
- All list endpoints must include a pagination sub-item (cursor or limit/offset, max 100)
- All multi-table mutations must include a `db.transaction()` sub-item
- All email sends must route through BullMQ — never inline in the request cycle
- All file imports (NAP, PER, APE) must be processed in background jobs
- JWT access tokens stored in memory only — refresh tokens in httpOnly cookie
- Every exported function must have a JSDoc comment sub-item in its checklist
- TypeScript strict mode must be confirmed passing at every phase boundary
- ESLint + Prettier must pass at every phase boundary
- **UI Design Enforcement:** UI components must adopt a modern floating Canva style, featuring smooth rounded shapes and pastel gradient colors (blue, purple, green) on clean white backgrounds.
- **WebSocket Enforcement:** Socket.io implementations must be configured on a dedicated namespace with independent CORS settings.
- **Performance Testing:** Raw performance baselining must be conducted strictly *before* Phase 10 Security Hardening is applied, to measure unobstructed API speed.

---

### Do Not

- Do not write any code
- Do not explain concepts or definitions
- Do not include introductory or closing paragraphs
- Do not skip any module, endpoint, component, or configuration that can be inferred from the criteria or the system description

---

### Output only the implementation plan and checklist. Be exhaustive.

### Phase 7 Criteria

Foundational Usability: The Non-Negotiables
These are the bedrock principles of any good user experience. A product must pass these checks before any advanced techniques are layered on.

Visibility of System Status: The design should always keep users informed about what is going on, providing appropriate feedback within a reasonable time.

Match between System and the Real World: The interface should speak the users' language, using words, phrases, and concepts familiar to them, rather than internal jargon. It should follow real-world conventions, making information appear in a natural and logical order.

User Control and Freedom: Users need a clearly marked "emergency exit" to leave an unwanted state without having to go through an extended process. Support Undo and Redo functions.

Consistency and Standards: Maintain internal consistency across your product (e.g., consistent terminology, layout, and component behavior) and external consistency with platform conventions (e.g., using standard icons for common actions).

Error Prevention: The best error message is the one that never appears. Design the interface to prevent problems from occurring in the first place. If an error does occur, it should be easily noticeable and provide constructive, specific guidance on how to fix it.

Recognition Rather than Recall: Minimize the user's memory load by making objects, actions, and options visible. Instructions for use of the system should be easily retrievable whenever appropriate.

Flexibility and Efficiency of Use: Accommodate both novice and expert users. Allow users to tailor frequent actions through accelerators like keyboard shortcuts or customizable menus.

Aesthetic and Minimalist Design: Dialogues should not contain information that is irrelevant or rarely needed. Every extra unit of information in a dialogue competes with the relevant units of information and diminishes their relative visibility.

Help Users Recognize, Diagnose, and Recover from Errors: Error messages should be expressed in plain language (no error codes), precisely indicate the problem, and constructively suggest a solution.

Help and Documentation: Even though it's better if the system can be used without documentation, it may be necessary to provide help. Any such information should be easy to search, focused on the user's task, and list concrete steps to be carried out.

♿ Digital Inclusion: Accessibility & WCAG 2.2 Compliance
Accessibility ensures your design is usable by everyone, regardless of their abilities. It's a core component of modern UX and often a legal requirement.

Perceivable: Information and user interface components must be presentable to users in ways they can perceive.

Non-text Content: Provide text alternatives for images, videos, and icons (e.g., descriptive alt text).

Color & Contrast: Ensure a color contrast ratio of at least 4.5:1 for normal text and 3:1 for large text against its background. Do not rely on color alone to convey information; use icons or text labels as well.

Operable: Interface components and navigation must be operable.

Keyboard Accessible: All functionality must be available using a keyboard alone. Ensure a visible focus indicator is present on all interactive elements.

Touch Targets: Ensure touch targets are a minimum of 44x44px for iOS and 48x48dp for Android to prevent mis-taps.

Enough Time: Provide users enough time to read and use content, with options to extend time limits.

Seizures and Physical Reactions: Do not design content in a way that is known to cause seizures (e.g., avoid flashing content that exceeds three flashes per second).

Understandable: Information and the operation of the user interface must be understandable.

Readable: Ensure content is readable and understandable, using clear fonts and simple language.

Predictable: Make web pages appear and operate in predictable ways. Consistent navigation and labeling help with this.

Robust: Content must be robust enough that it can be interpreted by a wide variety of user agents, including assistive technologies.

Semantic HTML: Use proper HTML elements for headings, lists, landmarks, and forms to ensure screen readers can navigate content correctly.

ARIA: Use ARIA attributes sparingly and only when native HTML semantics are insufficient, to define the roles, states, and properties of custom UI components.

🎨 Visual & UI Design: The Modern Aesthetic
This category covers the visual appeal and polish of the interface, incorporating contemporary trends for a fresh look and feel.

Design Systems: Utilize a unified, modular design system (e.g., Material Design, Fluent) to ensure visual and functional consistency across the entire product.

Color Palette: Define a primary, secondary, and accent color palette. Ensure colors are accessible (see above). In 2026, there's a strong trend towards "calm and clean designs" with neutral backgrounds that reduce visual noise and improve focus.

Typography: Establish a clear typographic scale (e.g., using 8pt or 4pt grid systems) with legible fonts. Kinetic typography, where text moves and animates to convey emotion or information, is a modern technique that can add dynamism to a page when used intentionally.

Spacing & Grids: Use a consistent spacing system (like an 8px grid) and a modern layout approach like Bento grids to organize content into visually distinct, easy-to-scan modules.

Iconography: Use a consistent, scalable icon set (e.g., from a design system) and ensure each icon has a clear, unambiguous meaning.

Imagery & 3D Elements: Use high-quality images and illustrations. Modern techniques include integrating interactive 3D elements to enhance storytelling and create immersive, engaging experiences.

Dark Mode: Design a dedicated dark theme that reduces eye strain in low-light environments and saves battery life on OLED screens. Ensure it is a distinct, high-contrast alternative and not just an inverted color scheme.

↔️ Interaction Design: The Feel of the Interface
This covers how users interact with your design and the feedback they receive.

Microinteractions: Design subtle, purposeful animations that provide feedback and guide the user's eye. A button that pulses on click or an icon that wiggles after a successful action adds a layer of polish and satisfaction. The key is to use them thoughtfully to avoid distraction or "microinteraction overload".

Navigation & IA: Ensure the information architecture is intuitive. Users should always know where they are, where they came from, and how to get to where they want to go.

Form Design: Create user-friendly forms that prioritize speed and clarity:

Use inline validation to provide real-time feedback.

Use clear, always-visible labels for all fields; do not use placeholder text as a replacement.

Group related fields together logically.

Provide clear and helpful error messages and summaries.

Loading & Empty States: Design custom loading animations (skeleton screens are preferred) to make wait times feel shorter. Create helpful empty states that guide users on what to do next.

Gestures: For mobile and tablet, support common touch gestures like swipe, pinch-to-zoom, and long-press for contextual actions.

📱 Mobile-First & Responsive Design: Designing for Every Screen
This approach ensures the experience is optimal on any device.

Mobile-First Strategy: Start the design process with the smallest screen in mind. This forces you to prioritize essential content and functionality, leading to a cleaner and more performant experience across all devices.

Responsive Breakpoints: Test and refine your design at key breakpoints: 320px, 375px, 768px, 1024px, 1440px, and 1920px to ensure a seamless experience from small phones to large desktop monitors.

Thumb-Friendly Design: For mobile, place primary actions and navigation within the natural arc of a user's thumb to improve reachability and comfort.

Cross-Platform Parity: Ensure the core user experience is consistent across different platforms (iOS, Android, web) while respecting platform-specific conventions where necessary.

⚡ Performance & Technical Excellence
A beautiful design is useless if it's slow. Performance is a key part of the user experience.

Core Web Vitals: Optimize for Google's Core Web Vitals: Largest Contentful Paint (LCP), Interaction to Next Paint (INP), and Cumulative Layout Shift (CLS). These metrics are direct measures of user-experience quality.

Page Load Speed: Ensure pages load in under 2 seconds on mobile. Optimize images, minify CSS/JS, and leverage browser caching.

Accessibility Validation: Use automated tools like WAVE, Accessibility Checker, and Google Lighthouse to identify and fix accessibility issues, but always supplement with manual testing.

✍️ Content & UX Writing: The Voice of the Product
The words in an interface are just as important as its visuals.

Voice and Tone: Define a clear, consistent brand voice and tone for all microcopy. Is it friendly and casual or formal and professional?

Clarity over Cleverness: Use plain, action-oriented language. Users should know exactly what to do next without second-guessing. Avoid jargon and ambiguous labels.

Effective Microcopy: Write concise and helpful button labels, error messages, and confirmation dialogs. For example, instead of "Error 504," write "We're having trouble connecting. Please try again in a few moments."

Accessibility in Content: Use clear headings and link text. Avoid "click here"; instead, use descriptive text like "Read more about our design services." Prepare your content for localization and translation.

🤖 Advanced & Modern Techniques: The Cutting Edge
These forward-thinking techniques can set your design apart and create truly innovative experiences.

AI-Powered Personalization: Use AI to tailor content, recommendations, and even the UI layout to individual user preferences in real-time. This must be done transparently, with clear user consent and a strong privacy-by-design approach.

Proactive & Context-Aware UX: The most advanced UX of 2025 and beyond is predictive. It's less about waiting for the user to interact and more about proactively offering the right information or action based on context. The goal is an interface that is "the one the user never has to open".

Voice User Interfaces (VUI): Design conversational interfaces for smart assistants and voice-enabled applications. This requires a different mindset, focusing on natural language processing and dialog flows rather than visual screens.

Procedural & Complex Animations: While microinteractions are small and functional, complex animations can be used to create narrative and delight. This includes animated illustrations, scroll-triggered animations, and advanced page transitions that feel smooth and cinematic.

By using this checklist as your guide, you can create UI/UX designs that are not only beautiful and functional but also inclusive, high-performing, and ready for the future. Good luck with your project!
