# Latte Cafe — Calendar App Redesign Spec

A handoff for an LLM implementing this design on an existing Vercel-hosted React calendar app. Apply these tokens, components, and layout patterns to match the "Latte Cafe" direction.

---

## 1. Brand & vibe

- **Mood:** warm, cozy, cafe-morning, loving. Coffee shop on a weekend.
- **Couple:** Emad (husband) & Budoor (wife).
- **Motif:** paws appear sparingly (header tagline, notes label). Hearts for romantic accents. No emoji in UI chrome.
- **Voice:** soft and friendly. "brewing memories", "Plan a Date", "Send Invite", "Meow Notes".

---

## 2. Fonts (load in `<head>`)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caprasimo&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
```

| Use | Family | Weights |
|---|---|---|
| Display / headings / day numbers / "May 2026" / weekday letters | `Caprasimo` | 400 only |
| Body, buttons, inputs, event chips | `Outfit` | 400, 500, 600, 700 |

Set on `<body>`: `font-family: 'Outfit', -apple-system, sans-serif;`

---

## 3. Color tokens

Use these as CSS custom properties:

```css
:root {
  /* Surfaces */
  --bg:          #f5ede0;  /* oat milk — page bg */
  --bg-grain:    rgba(120, 80, 40, 0.04);
  --card-bg:     #fffaf2;  /* foam — cards, calendar surface */
  --card-border: #ead9bd;
  --card-shadow: 0 1px 0 #fff inset, 0 12px 32px -16px rgba(80, 50, 20, 0.18);
  --divider:     #ebd9ba;

  /* Text */
  --text:        #3b2716;  /* espresso */
  --text-soft:   #8a6f55;  /* mocha */
  --text-very:   #bba18a;  /* faint */

  /* Accent — dark roast brown */
  --accent:      #6b3a1f;
  --accent-soft: #f3dcc4;
  --on-accent:   #fce8c8;  /* cream text on accent */

  /* Inputs */
  --input-bg:     #fff8ec;
  --input-border: #e6d3b3;

  /* Chips & pills */
  --chip-bg:     #fbf2e1;
  --chip-border: #ead9bd;
  --chip-text:   #5a3a22;

  /* Hover-popover (dark) */
  --pop-bg:      #3b2716;
  --pop-text:    #fce8c8;
  --pop-shadow:  0 18px 40px -10px rgba(40, 20, 10, 0.45);
}

body {
  background: var(--bg);
  background-image: radial-gradient(var(--bg-grain) 1px, transparent 1px);
  background-size: 14px 14px;  /* subtle paper texture */
}
```

### Category colors (event color-coding)

| Category id | bg | fg (text) | dot/border |
|---|---|---|---|
| `romantic`  | `#fce0d8` | `#9b3a2a` | `#c14a33` |
| `datenight` | `#e8d6c2` | `#6b3a1f` | `#8a4a22` |
| `adventure` | `#fae3b8` | `#8a5a14` | `#c98a2a` |
| `special`   | `#f9d77a` | `#7a4f10` | `#d99a1c` |
| `chores`    | `#e4ddd0` | `#6b5840` | `#8a7858` |
| `casual`    | `#e6dccb` | `#5e4a30` | `#a08868` |
| `other`     | `#dfd6c6` | `#5a4a35` | `#8a7858` |

Each event chip uses `bg` as background, `fg` as text, and a 3px **left border** in `dot`.

---

## 4. Iconography

Replace all mismatched emoji with custom-drawn line SVG icons. All use:
- `stroke-width: 1.6` (1.8 for the heart)
- `stroke-linecap: round`, `stroke-linejoin: round`
- `viewBox="0 0 24 24"`
- `currentColor` so they tint with text color

You need these icons: **Heart, Paw, Coffee, Calendar, Note, Target (bucket list), Archive, Plus, X (close), Send, Sun (all-day toggle)**, and seven **category icons**: CatRomantic (filled heart), CatDate (martini glasses), CatAdventure (mountain), CatSpecial (house/gift), CatChores (broom), CatCasual (chat bubbles), CatOther (paw).

Heart icon example:
```jsx
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
     strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
  <path d="M12 20s-7-4.5-7-10.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 7 3.5C19 15.5 12 20 12 20z"/>
</svg>
```

Paw icon (fill, not stroke):
```jsx
<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
  <ellipse cx="6" cy="10" rx="2" ry="2.6"/>
  <ellipse cx="18" cy="10" rx="2" ry="2.6"/>
  <ellipse cx="9.5" cy="6" rx="1.8" ry="2.4"/>
  <ellipse cx="14.5" cy="6" rx="1.8" ry="2.4"/>
  <path d="M12 12c-3.5 0-6 3-6 5.5C6 19.4 7.6 21 9.5 21c1 0 1.5-.6 2.5-.6s1.5.6 2.5.6c1.9 0 3.5-1.6 3.5-3.5 0-2.5-2.5-5.5-6-5.5z"/>
</svg>
```

(Build the rest in the same line-style — never use emoji in chrome.)

---

## 5. Main calendar page layout

Top-down stack with 32px horizontal padding:

```
Header                    (20px top pad)
Countdown banner          (20px gap)
Calendar card             (18px gap)
Floating "New event" btn  (absolute, bottom 24, right 32)
```

### 5.1 Header (top row)

`display: flex; justify-content: space-between; align-items: center;`

**Left:** logo block + title
- Logo: 44×44, `border-radius: 14`, `background: var(--accent)`, drop shadow. Contains Coffee SVG icon, `color: #fce8c8`.
- Title: `"Our Calendar"`, `font-family: Caprasimo`, `font-size: 28`, `color: var(--accent)`.
- Subtitle below: paw icon (10px) + `"Emad & Budoor · brewing memories since 2019"`, 12px, `color: var(--text-soft)`.

**Right:** three pill buttons + sign out
1. **Days-together pill** — white card with rounded-pill shape. Two overlapping 26px avatar circles ("E" on `#6b3a1f`, "B" on `#c14a33`, white border, Caprasimo letter inside, second nudged `margin-left: -8px`). Then two-line text: bold `"{N} days"` + `"together ♥"` at 10.5px.
2. **"Send note" pill** — white card, filled red heart icon (#c14a33), label "Send note". Opens cute-note drawer (see §8).
3. **Sign out** — bare text link, `color: var(--text-soft)`.

### 5.2 Countdown banner

Full-width gradient card.

```css
background: linear-gradient(135deg, #6b3a1f 0%, #8a4a22 100%);
border-radius: 24px;
padding: 20px 26px;
color: #fce8c8;
box-shadow: 0 14px 30px -14px rgba(60, 30, 10, 0.5);
position: relative;
overflow: hidden;
```

**Layout:** flex row, space-between.

**Left side:**
- Decorative steam-swirl SVG floats at `top: -4, right: 24, opacity: 0.15`. Three wavy paths in cream.
- Big day-counter square: 64×64, `border-radius: 18`, `background: rgba(252, 232, 200, 0.15)`, `border: 1.5px solid rgba(252, 232, 200, 0.3)`. Inside: huge `daysUntilNext()` number in Caprasimo 26px, then 9.5px label "DAYS" with `letter-spacing: 0.08em`.
- To right of square: 11.5px uppercase eyebrow "UP NEXT TOGETHER" (opacity 0.75), then 22px Caprasimo title (the event name), then 12.5px subtitle date + context.

**Right side:** three vertical action tiles (Notes, Bucket List, Archive). Each:
- 64px wide, `padding: 10px 14px`, `border-radius: 14`
- `background: rgba(252, 232, 200, 0.12)`, `border: 1px solid rgba(252, 232, 200, 0.2)`
- icon (18px) over 11px label, stacked

### 5.3 Calendar card

```css
background: var(--card-bg);
border-radius: 24px;
border: 1px solid var(--card-border);
box-shadow: var(--card-shadow);
overflow: hidden;
```

#### Toolbar (top of card)

- `padding: 14px 18px`, `border-bottom: 1px solid var(--divider)`.
- 3 sections, space-between:
  1. **Left** — three pill buttons (Today / Back / Next). "Today" is the only highlighted one: `background: var(--accent-soft)`, `color: var(--accent)`, font-weight 600. Others: transparent, `color: var(--text-soft)`. All `padding: 7px 13px`, `border-radius: 999`.
  2. **Center** — month title in Caprasimo 20px, `color: var(--accent)`.
  3. **Right** — segmented control (Month / Week / Day) inside a pill. Wrapper: `background: var(--bg)`, `padding: 3`, `border-radius: 999`, `border: 1px solid var(--divider)`. Active segment: white background with shadow. Inactive: transparent. Both 12.5px Outfit.

#### Weekday header

Grid of 7 columns. `padding: 10px 0`, `background: var(--bg)`. Each cell: Caprasimo 12px, lowercase, `letter-spacing: 0.12em`, `color: var(--text-soft)`, centered. Labels: "sun", "mon", "tue", "wed", "thu", "fri", "sat".

#### Day grid

6-week grid (42 cells) starting Sunday before month 1st. `border-top: 1px solid var(--divider)`. Each row min-height **116px** (cozy) or **96px** (compact). Borders between cells: 1px solid `var(--divider)`.

Per-cell logic:
- **In-month, weekday:** `background: var(--card-bg)`.
- **In-month, weekend (Sun/Sat):** `background: rgba(245, 237, 224, 0.4)` (subtle tint).
- **Out-of-month:** `background: rgba(245, 237, 224, 0.7)`, `opacity: 0.55`.
- **Today:** `background: #fae3b8` (honey gold), and day number renders in Caprasimo 16px, color `var(--accent)`, with a small `TODAY` pill (9.5px, cream bg, accent border) in the top-right.

Day number (top-left of cell): Caprasimo 14px, 2-digit zero-padded (`"01"`, `"23"`).

#### Event chips inside a cell

Stack vertically, `gap: 4px`. Each chip:

```css
display: flex; align-items: center; gap: 6px;
background: var(--cat-bg);
color: var(--cat-fg);
padding: 4px 7px 4px 6px;
border-radius: 8px;
font-size: 11.5px;
font-weight: 500;
border-left: 3px solid var(--cat-dot);
overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
cursor: pointer;
```

Chip contains: 11px category icon + event title. On hover → show popover (§7).

### 5.4 Floating "New event" button

```css
position: fixed; bottom: 24px; right: 32px;
display: flex; align-items: center; gap: 10px;
background: var(--accent); color: #fce8c8;
padding: 14px 22px;
border-radius: 999px; border: none;
font: 600 15px Outfit;
box-shadow: 0 14px 32px -10px rgba(60, 30, 10, 0.55);
cursor: pointer;
```

Plus icon (18px) + label "New event".

---

## 6. Create Event modal

Triggered by the floating button. Centered overlay.

**Backdrop:** `background: rgba(40, 25, 15, 0.45)`, `backdrop-filter: blur(6px)`, fade-in `.18s`.

**Modal shell:**
```css
width: 720px;
max-height: 88vh;
background: var(--card-bg);
border-radius: 28px;
box-shadow: 0 30px 80px -20px rgba(40, 20, 5, 0.5);
overflow: hidden;
display: flex; flex-direction: column;
animation: slideUp .22s ease;  /* opacity + translateY(12px) -> 0 */
```

### Modal sections (top → bottom)

#### Header strip
- `padding: 20px 24px 16px`
- `background: linear-gradient(180deg, #fbeed7 0%, #fffaf2 100%)`
- `border-bottom: 1px solid var(--divider)`
- Flex row, space-between:
  - **Left:** 40×40 accent square (radius 12) with calendar icon → next to it: `<h2>"Plan a Date"</h2>` in Caprasimo 22px accent color, subtitle "A new memory for the books ♥" in 12px text-soft.
  - **Right:** 32×32 close button. `background: rgba(255,255,255,0.6)`, radius 10, X icon in text-soft.

#### Body — **CRITICAL: 2-column grid, not stacked**

```css
padding: 20px 24px;
display: grid;
grid-template-columns: 1fr 1fr;
gap: 20px;
overflow-y: auto;
```

This is the #1 fix vs the old design — keeps the modal short enough to not need scrolling on common laptop heights.

**Left column:**
1. **"What are we doing?"** label + text input + a small `"Pick from Bucket List"` button below (transparent, target icon + accent text, 12.5px).
2. **"Category"** label + 2×N grid of category buttons (`grid-template-columns: repeat(2, 1fr)`, `gap: 6px`). Each button:
   - 26×26 colored icon swatch (cat bg/fg) + label.
   - Unselected: `background: transparent`, `border: 1.5px solid var(--input-border)`.
   - Selected: `background: var(--cat-bg)`, `border: 1.5px solid var(--cat-dot)`, font-weight 600.

**Right column:**
1. **"When?"** label + flex row: date input (flex 1) + time input (110px wide, hidden when all-day). Below: All-day toggle styled as a custom checkbox card (see below).
2. **"Meow Notes" + paw icon** label + textarea, `min-height: 96px`, `resize: none`, `line-height: 1.5`.

#### All-day toggle (custom)

```jsx
<label style={allDay ? activeStyle : inactiveStyle}>
  <input type="checkbox" hidden />
  <span className="custom-box">{checkmark}</span>
  <SunIcon />
  All day
</label>
```

- Inactive: `background: var(--input-bg)`, `border: 1.5px solid var(--input-border)`, text in `var(--text)`.
- Active: `background: #fae3b8`, `border: 1.5px solid #d99a1c`, text in `#7a4f10`.
- Custom checkbox box: 18×18, radius 6, fills `#d99a1c` with white checkmark SVG when active.

#### Standard input styling

```css
.input, input[type=text], input[type=date], input[type=time], textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid var(--input-border);
  border-radius: 12px;
  background: var(--input-bg);
  color: var(--text);
  font: 13.5px Outfit;
  outline: none;
}
```

#### Footer
- `padding: 14px 24px`, `background: #fbf2e1`, `border-top: 1px solid var(--divider)`.
- Flex space-between:
  - **Left:** filled red heart + "Budoor will be notified" in 12px text-soft.
  - **Right:** Cancel (transparent text button) + **Send Invite** (filled accent button with Send icon, `padding: 10px 22px`, radius 12, font-weight 600, shadow `0 6px 14px -6px rgba(60,30,10,0.5)`).

#### Field label style

```css
.field-label {
  font: 600 12px Outfit;
  color: var(--text);
  margin-bottom: 6px;
  letter-spacing: 0.02em;
  display: flex; align-items: center; gap: 6px;
}
```

---

## 7. Event hover popover

When the mouse hovers over an event chip in a calendar cell, fade in a small dark card:

```css
.popover {
  position: absolute;
  /* If cell is in bottom 2 rows, anchor above (bottom: 100%); else below */
  background: var(--pop-bg);   /* #3b2716 */
  color: var(--pop-text);      /* #fce8c8 */
  border: 1px solid var(--pop-bg);
  border-radius: 14px;
  padding: 12px 14px;
  min-width: 220px; max-width: 280px;
  box-shadow: var(--pop-shadow);
  font-size: 13px;
  opacity: 0; pointer-events: none;
  transform: translateY(4px);
  transition: opacity .15s, transform .15s;
}
.chip:hover .popover { opacity: 1; transform: translateY(0); pointer-events: auto; }
```

Content:
- Header row: 22×22 swatch (cat bg/fg) with 14px category icon + event title in 600 weight.
- 12px sub-line: long date + "All day" or time.
- 12.5px notes preview (`white-space: pre-line`, opacity 0.85).

---

## 8. Send-a-note drawer

A floating card, top-right, opened by the "Send note" header button.

```css
position: absolute;
right: 24px; top: 80px;
width: 320px;
background: var(--card-bg);
border-radius: 22px;
padding: 18px;
box-shadow: var(--card-shadow);
border: 1px solid var(--card-border);
/* hidden: opacity 0, transform translateY(-10px), pointer-events none */
/* shown: opacity 1, transform translateY(0) */
transition: opacity .18s, transform .18s;
```

Inside:
- Header row: filled heart + bold `"Send Budoor a note"` + close X button.
- Textarea (full width, 80px min-height, radius 12, `var(--input-bg)`, placeholder `"say something cute…"`).
- Preset chip row below: 5 prompt chips. Each: `background: var(--chip-bg)`, `border: 1px solid var(--chip-border)`, `color: var(--chip-text)`, `border-radius: 999`, `padding: 5px 9px`, `font-size: 11.5px`. Clicking a chip sets the textarea text. Suggested presets:
  - "thinking of you ♥"
  - "pick me up some coffee?"
  - "miss you already"
  - "you're my favorite human"
  - "goodnight, my love"
- Send button (full width): `background: var(--accent)`, `color: var(--on-accent)`, radius 12, padding `10px 14px`, send icon + "Send note". Disabled (gray) when textarea is empty.
- After send: show success state — big envelope, "sent with love" bold, then sub-text "she'll see it next time she opens the app". After ~1.6s, reset and close.

---

## 9. Sample event data (for layout testing)

```js
const events = [
  { date: '2026-05-01', title: 'FROM watch party',           category: 'casual' },
  { date: '2026-05-02', title: 'Suwaikhat breakfast',        category: 'datenight' },
  { date: '2026-05-04', title: "Check out Huda's apartment", category: 'chores' },
  { date: '2026-05-05', title: 'Take Yusr to the Park',      category: 'adventure' },
  { date: '2026-05-08', title: 'Movie night',                category: 'datenight' },
  { date: '2026-05-10', title: 'Yusr Vaccination (1 Year)',  category: 'chores' },
  { date: '2026-05-14', title: 'Weekend Activities',         category: 'special' },
  { date: '2026-05-22', title: 'Anniversary dinner',         category: 'romantic' },
  { date: '2026-05-23', title: 'Hike Jebel Shams',           category: 'adventure' },
];
```

---

## 10. Implementation checklist for the LLM

When applying these changes to the existing app:

- [ ] Load `Caprasimo` + `Outfit` from Google Fonts.
- [ ] Add the CSS custom properties block to global stylesheet.
- [ ] Replace any emoji used in UI chrome with the custom SVG icon set. Keep emoji only in user-generated content (note text, event titles).
- [ ] Header: replace existing header with logo block + days-together pill + Send-note button + Sign out.
- [ ] Add countdown banner above the calendar (compute `daysUntilNext = days from today to closest upcoming event`).
- [ ] Calendar toolbar: swap to pill buttons (Today/Back/Next), Caprasimo "Month YYYY" title, segmented Month/Week/Day control.
- [ ] Weekday header in Caprasimo 12px lowercase letter-spaced.
- [ ] Day numbers in Caprasimo (2-digit zero-padded for in-month days).
- [ ] Today cell: `#fae3b8` background + accent day number + TODAY pill.
- [ ] Event chips: color-coded by category, 3px left-border in `cat.dot`, category icon + title, hover popover.
- [ ] Floating "New event" pill button bottom-right.
- [ ] Rewrite Create Event modal to be **2-column** with the styling in §6. Replace all default date/time controls with the custom-styled inputs. Replace category emoji selector with the custom icon grid.
- [ ] Add the cute-note drawer + Send-note header button.
- [ ] Keep paws sparing — header tagline, notes label, that's it. Hearts for romantic touches.

---

## 11. Reference React structure

If your codebase is React, a sketch:

```
<App>
  <Header>
    <Logo />
    <DaysTogetherPill />
    <SendNoteButton onClick={openDrawer} />
    <SignOutLink />
  </Header>
  <CountdownBanner event={nextEvent} daysUntil={d} />
  <CalendarCard>
    <Toolbar />
    <WeekdayHeader />
    <DayGrid>
      {cells.map(cell => (
        <Cell isToday inMonth>
          <DayNumber />
          {cell.events.map(e => <EventChip event={e} />)}
        </Cell>
      ))}
    </DayGrid>
  </CalendarCard>
  <FloatingNewEventButton onClick={openModal} />

  {modalOpen && <CreateEventModal onClose={closeModal} />}
  <CuteNoteDrawer open={drawerOpen} onClose={closeDrawer} />
</App>
```

Each `EventChip` wraps its label in a hover-popover host. Use CSS `:hover` to reveal the popover (no React state, avoids re-renders on every cell).

---

That's everything. Implement top-down: tokens → fonts → header → banner → calendar → modal → drawer. Test on a 1280×800 viewport — the design targets that resolution.
