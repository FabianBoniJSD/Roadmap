# Phase Information Feature - UI Preview

## 1. Project Form - Phase Information Section

When creating or editing a project, users will see a new section:

```
╔══════════════════════════════════════════════════════════════════════╗
║                     Phaseninformationen (optional)                   ║
║                                                                      ║
║  Fügen Sie für jede Projektphase einen kurzen beschreibenden        ║
║  Text hinzu.                                                         ║
║                                                                      ║
║  ┌────────────────────────────────────────────────────────────────┐ ║
║  │ Initialisierung                                                │ ║
║  │ ┌────────────────────────────────────────────────────────────┐ │ ║
║  │ │ Informationen zur Initialisierungsphase                    │ │ ║
║  │ │                                                            │ │ ║
║  │ └────────────────────────────────────────────────────────────┘ │ ║
║  └────────────────────────────────────────────────────────────────┘ ║
║                                                                      ║
║  ┌────────────────────────────────────────────────────────────────┐ ║
║  │ Konzept                                                        │ ║
║  │ ┌────────────────────────────────────────────────────────────┐ │ ║
║  │ │ Informationen zur Konzeptphase                             │ │ ║
║  │ │                                                            │ │ ║
║  │ └────────────────────────────────────────────────────────────┘ │ ║
║  └────────────────────────────────────────────────────────────────┘ ║
║                                                                      ║
║  ┌────────────────────────────────────────────────────────────────┐ ║
║  │ Realisierung                                                   │ ║
║  │ ┌────────────────────────────────────────────────────────────┐ │ ║
║  │ │ Informationen zur Realisierungsphase                       │ │ ║
║  │ │                                                            │ │ ║
║  │ └────────────────────────────────────────────────────────────┘ │ ║
║  └────────────────────────────────────────────────────────────────┘ ║
║                                                                      ║
║  ┌────────────────────────────────────────────────────────────────┐ ║
║  │ Einführung                                                     │ ║
║  │ ┌────────────────────────────────────────────────────────────┐ │ ║
║  │ │ Informationen zur Einführungsphase                         │ │ ║
║  │ │                                                            │ │ ║
║  │ └────────────────────────────────────────────────────────────┘ │ ║
║  └────────────────────────────────────────────────────────────────┘ ║
║                                                                      ║
║  ┌────────────────────────────────────────────────────────────────┐ ║
║  │ Abschluss                                                      │ ║
║  │ ┌────────────────────────────────────────────────────────────┐ │ ║
║  │ │ Informationen zur Abschlussphase                           │ │ ║
║  │ │                                                            │ │ ║
║  │ └────────────────────────────────────────────────────────────┘ │ ║
║  └────────────────────────────────────────────────────────────────┘ ║
╚══════════════════════════════════════════════════════════════════════╝
```

**Features:**
- Bordered section with distinct styling (dark background)
- Title and description explaining the purpose
- 5 text areas (2 rows each)
- Placeholder text for each phase
- Located after "Nächster Meilenstein" field
- Same layout for both short-term and long-term projects

## 2. Project Detail Page - Phase Timeline

### Before (without custom text):
```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│ 1        │ 2        │ 3        │ 4        │ 5        │
│          │          │          │          │          │
│ Initiali-│ Konzept  │ Realisie-│ Ein-     │ Abschluss│
│ sierung  │          │ rung     │ führung  │          │
│          │          │          │          │          │
│ Ziele,   │ Lösungs- │ Umsetz-  │ Rollout, │ Review,  │
│ Scope und│ skizze,  │ ung,     │ Schulung,│ Dokumen- │
│ Machbar- │ Architek-│ Tests und│ Change   │ tation,  │
│ keit     │ tur,     │ Integra- │ Manage-  │ Übergabe │
│ klären.  │ Planung. │ tion.    │ ment.    │          │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

### After (with custom text for Initialisierung):
```
┌────────────────────────────────────────────────────────────────┐
│ 1                                                      [AKTIV]  │
│                                                                 │
│ Initialisierung                                                 │
│ Ziele, Scope und Machbarkeit klären.                          │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Stakeholder-Meetings durchgeführt, Budget genehmigt,       ││
│ │ erste Risikoanalyse abgeschlossen.                         ││
│ └─────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────┘
```

**Visual Enhancements:**
- Active phase highlighted with blue border and background
- Custom text appears in a darker, bordered box
- Text only displayed if data exists (graceful degradation)
- Maintains responsive grid layout (5 columns on desktop)

## 3. Styling Details

### Phase Information Section (Form)
- Background: `bg-slate-900/50` (semi-transparent dark)
- Border: `border-slate-800/70` (subtle)
- Border radius: `rounded-2xl` (smooth corners)
- Padding: `p-6`
- Each text area:
  - Rows: 2
  - Border: `border-slate-800/70`
  - Background: `bg-slate-950`
  - Focus state: Blue ring with sky-400 color

### Phase Info Box (Detail Page)
- Border: `border-slate-700/50`
- Background: `bg-slate-950/50`
- Padding: `px-3 py-2`
- Border radius: `rounded-lg`
- Text: `text-xs text-slate-200`
- Spacing: `mt-3` (margin-top from description)

### Active Phase Card
- Border: `border-sky-500/60`
- Background: `bg-sky-500/15`
- Text: `text-sky-100`
- Shadow: `shadow-lg shadow-sky-900/40`
- Badge: "AKTIV" in uppercase with sky-colored background

### Inactive Phase Card
- Border: `border-slate-800/70`
- Background: `bg-slate-900/70`
- Text: `text-slate-300`

## 4. Responsive Behavior

### Desktop (md and up)
- Phase timeline: 5-column grid
- Form section: Full width within form container

### Mobile
- Phase timeline: Single column stack
- Form section: Single column stack
- Text areas: Full width with appropriate padding

## 5. Accessibility

- Labels properly associated with text areas
- Semantic HTML structure
- Keyboard navigation supported
- Screen reader friendly
- ARIA labels where appropriate
- Focus states clearly visible

## 6. Data Flow Visualization

```
User Input (Form)
       ↓
State Management (React useState)
       ↓
Form Submission
       ↓
API Route (/api/projects)
       ↓
clientDataService.createProject/updateProject
       ↓
SharePoint REST API (POST/MERGE)
       ↓
RoadmapProjects List
       ↓
clientDataService.getProjectById
       ↓
Project Detail Page
       ↓
renderPhaseTimeline(project)
       ↓
Display in Timeline Cards
```

## 7. Example Use Case

**Scenario:** Project manager wants to add specific notes for each phase

**Input (Form):**
- Initialisierung: "Budget approved, stakeholders identified"
- Konzept: "Architecture review scheduled for Q2"
- Realisierung: "Development team assembled, sprint 1-8 planned"
- Einführung: "Training materials prepared, rollout plan finalized"
- Abschluss: "Lessons learned session scheduled, documentation handover"

**Output (Timeline):**
Each phase card shows the default description PLUS the custom notes in a highlighted box below, providing project-specific context that complements the generic phase descriptions.
