# ALICE Resume Workspace Integration (No Guesswork)

This guide wires the new Resume Workspace into your existing App.tsx.

---

# STEP 1 — Add imports

At the TOP of App.tsx, add:

```tsx
import ResumeWorkspace from "./resume/ResumeWorkspace";
import { JobData } from "./resume/ResumeEngine";
```

---

# STEP 2 — Add state

Inside:

```tsx
export default function App() {
```

Add this state near your other useState blocks:

```tsx
const [resumeWorkspaceOpen, setResumeWorkspaceOpen] = useState(false);
```

---

# STEP 3 — Add the button

Go to:

```text
SELECTED LISTING PANEL
```

Find your action buttons:

- Apply
- Save
- Ask Alice
- etc.

Add THIS button:

```tsx
<Button
  theme={theme}
  onClick={() => setResumeWorkspaceOpen(true)}
>
  Generate Tailored Resume
</Button>
```

---

# STEP 4 — Add Resume Workspace UI

Near the BOTTOM of App.tsx, INSIDE the main return()

Add this block ABOVE the final closing:

```tsx
{resumeWorkspaceOpen && selected && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.75)",
      zIndex: 9999,
      overflow: "auto",
      padding: "40px",
    }}
  >
    <div
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
        background: "#111",
        borderRadius: "20px",
        padding: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ margin: 0 }}>
          Resume Workspace
        </h2>

        <button
          onClick={() =>
            setResumeWorkspaceOpen(false)
          }
        >
          Close
        </button>
      </div>

      <ResumeWorkspace
        selectedJob={selected as JobData}
      />
    </div>
  </div>
)}
```

---

# STEP 5 — Run the app

Inside terminal:

```bash
npm run dev
```

---

# EXPECTED RESULT

Inside Selected Listing:

```text
Generate Tailored Resume
```

Clicking it opens:

- tailored summary
- prioritized strengths
- ranked experience
- editable resume workspace foundation

---

# WHAT'S NEXT

Next build phase:

1. Resume editing
2. Export PDF
3. Export DOCX
4. Cover letter generator
5. Application workspace
6. Application tracker

