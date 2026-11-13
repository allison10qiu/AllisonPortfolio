# Case study style

The shared visual language for case studies on allisonqiu.com. Implemented in `styles/case-study.css` and `scripts/case-study.js`, used by NABU, Operation Safe Escape, Brilliant Cities and Anda. Each page's chapters live in `_artboards/cs/<slug>.html` and are built into `projects/<slug>.html` with `python3 _artboards/cs/build.py <slug>`, which keeps the page's head, site header, Where to next and footer.

Rules marked **Shared** apply to every case study. Rules marked **NABU** are choices made for that story; other projects should pick their own.

---

## Principles (Shared)

- The work leads. Product visuals carry the story; the page around them stays quiet.
- A reader should get the project, the problem, my part and the key decisions from a quick scroll, and find depth if they stop.
- No decorative cards, progress counters, repeated summaries or labels that restate a heading.
- Every case study shares the type, spacing, navigation and image treatment. Story structure, chapter names and layout sequence are per project.

## Color, borders, shadows (Shared)

| Token | Value | Use |
|---|---|---|
| Ink | `#181818` | Headings, active nav, emphasis |
| Grey 1 | `#393939` | Body text |
| Grey 2 | `#707070` | Labels, captions, inactive nav. Lightest grey allowed for text. |
| Grey 4 | `#DCDCDC` | Diagram outlines only |
| Grey 5 | `#ECECEC` | Hairlines (mobile chapter bar) |
| Image ground | `#F4F4F4` | Behind transparent cutouts only (the persona photo) |

- White page background. No tinted section backgrounds, no grey fills behind text.
- Screenshot frame: white, 3px radius, shadow `0 28px 50px -18px rgba(24,24,24,.28), 0 2px 6px rgba(24,24,24,.08)`.
- Video frame: 1px `#ECECEC` ring instead of the shadow.
- No dividers between sections. Space separates chapters.
- The only rule on the page is the 1.5px ink line on the left of a trade-off.

## Typography (Shared)

Serif: AQ Garamond (Apple Garamond, Cormorant Garamond fallback). Sans: Satoshi.

| Role | Face | Size | Line height | Notes |
|---|---|---|---|---|
| Page title | Serif 400 | clamp(36px, 3.9vw, 52px) | 1.0 | −0.045em, balanced wrap |
| Intro | Sans 400 | clamp(17px, 1.4vw, 19px) | 1.42 | Grey 1 |
| Chapter label | Sans 500 | 14px | 1.0 | Grey 2, sentence case, no numbers |
| Chapter heading | Serif 400 | clamp(28px, 2.6vw, 36px) | 1.1 | −0.04em, balanced wrap |
| Decision heading | Serif 400 | clamp(22px, 2vw, 26px) | 1.16 | Preceded by a small serif number |
| Sub-point heading | Serif 400 | 23px | 1.15 | Constraints, reflections |
| Body | Sans 400 | 17px | 1.42 | Grey 1 |
| Small text, facts | Sans 400 | 15.5px / 14.5px | 1.4 | |
| Caption, small label | Sans 400 | 13–14px | 1.4 | Grey 2, never smaller than 13px |

- Satoshi runs at 1.4–1.42 line height. Do not go back to 1.55+.
- Bold (weight 500, ink) at most once or twice per chapter, on the phrase that carries the decision.
- No uppercase tracked eyebrows.

## Widths and spacing (Shared)

- Content column: max 880px, centered in the space beside the sidebar. Text and images share the same left and right edges.
- Side margin around the content: clamp(32px, 9vw, 160px) on desktop, 40px from 600–1099px, 20px on phones.
- Text runs the full content width; there is no narrower reading column.
- Between chapters: clamp(88px, 9vw, 128px).
- Between decisions inside a chapter: 64px.
- Heading to body: 28px. Body to figure: 32–48px. Figure to caption: 12–14px.

## Navigation (Shared)

**Desktop and tablet (600px and up): quiet sidebar**
- "← All work", then the chapter names. No project name, metadata, numbers, counters or border.
- 216px wide from 1100px, 156px from 600–1099px. Sticky below the site header.
- Inactive chapters Grey 2. The active chapter is ink and weight 500, with no dash or marker.

**Phones (under 600px): chapter bar (Option C)**
- Sticky directly under the site header, 46px tall, white, 1px `#ECECEC` bottom line.
- Plain chapter names; the active one gets a 1.5px ink underline.
- Scrolls sideways. The right edge fades while more chapters are hidden; both edges fade mid-scroll.
- The active chapter scrolls itself into view.

**Both**
- Chapter jumps land the chapter label 24px below the header (plus the bar on phones).
- Links are real anchors with a visible 2px ink focus outline.
- Keep chapter names to one or two words.

## Hero (Shared pattern)

1. Title: descriptive, not a slogan.
2. One short intro: what the organization is and the area I worked on. It doesn't list my deliverables, because the next block does.
3. Spec block (layout D, slim): Role, Team, Timeline and Focus stacked on the left (small grey labels over values); Problem and My contribution stacked on the right in the same style. One column under 900px, facts in two columns.
4. The overview product image, straight after.

No Deliverable or outcome row in the hero; Outcome carries that.

## Composition patterns (Shared)

Choose a pattern for what the reader needs to understand. Don't alternate patterns for variety.

| Pattern | Use when | NABU example |
|---|---|---|
| Overview image | Establishing the product or a full screen, or the screen that proves a decision | Hero Role Builder; Review Partner Access under decision 03 |
| Text beside a diagram | Explaining a process that has no screen | Context workflow diagram |
| Image beside text (5:6, either side) | One focused decision with one focused crop | Decision 01, Create Role (image right); Decision 03, Add Partner (image left) |
| Overview + enlarged detail (1.6:1) | A decision that lives in one part of a dense screen | Decision 02, table + open list |
| Two related states (1.7:1) | Before and after an action, or two real states | Not used in NABU; reserve for a real comparison |
| Tabbed steps | A sequence where switching beats stacking | The builder, Steps 4 and 5 |
| Click-through states | A short interaction that only makes sense in motion, built from real exported states | Decision 03, Add Partner role picker |
| Simple sequence (2 × 2) | A chain of steps across screens | How it connects |
| Text grid (2 × 2) | Short parallel points without visuals | Constraints |

- Side-by-side layouts stack below 900px so images stay readable.
- Asymmetry is fine when it gives the important image more room.

## Screenshots, crops and captions (Shared)

- Full screens establish context. Focused crops explain a specific decision, keeping enough surrounding UI to orient.
- Crop vector screens (SVG) by changing the `viewBox`, so crops stay sharp. Never stretch a raster image beyond its pixel width.
- Don't fabricate states, charts or data. If an image can't support the point, flag the missing asset.
- Give the most important decision the largest image; supporting screens can be smaller.
- Captions only when they add information the image doesn't make obvious. One short sentence, Grey 2, no trailing labels.

## Annotations and interaction (Shared)

- Numbered markers only where they explain reasoning or a trade-off, never to point at an obvious control.
- Essential reasoning lives in visible text. Markers carry detail.
- Desktop: markers show a dark tooltip on hover, focus or click, with "Hover a number to see what it does" under the image. Escape closes.
- Phones: the numbered notes show as a list under the image.
- Markers are focusable buttons with labels; tabs support arrow keys.
- Click-throughs use only real exported states, keep the frame at the tallest state's height so nothing jumps, update a visible caption per state (announced politely), move focus to the next control, and close with Escape.
- No new interactive components without a reason the static version can't meet.

## Motion (Shared)

- Scroll reveal: each block fades in and rises 28px over 0.7s, staggered 70ms within a group, once only.
- Content is visible if the script doesn't run.
- `prefers-reduced-motion` turns off reveal, tooltip fades and smooth scrolling.

## Copy (Shared)

- A designer explaining their work to another person: clear, specific, natural.
- Connect context, decision and reasoning in one sentence where the relationship matters ("Because a role determines…, I kept…"). Keep short sentences for emphasis.
- Vary sentence openings and lengths. No slogans, inflated claims or generic lessons.
- Don't add research, testing, metrics or outcomes that aren't documented. Say plainly what isn't known (for example, no post-handoff usage data).
- Don't say the same thing in the paragraph, the marker and the caption.

## Accessibility (Shared)

- Text no lighter than `#707070` on white.
- Every image has descriptive alt text. Decorative diagram boxes are hidden from screen readers.
- Visible focus on links, markers and tabs.
- No horizontal scroll at 320px and up; check 1440, 1024, 768, 390 and 320.

## NABU-specific choices

- Six chapters: Context, Constraints, Key decisions, The builder, How it connects, Outcome.
- The composite persona (Leila) sits in Context with an explicit "Composite persona" label, a full-height photo on `#F4F4F4`, and no card.
- Decisions are numbered 01–03 because there are three distinct ones; other projects needn't number theirs.
- Focused crops in `_artboards/nabu-proto/crops/` are `viewBox` crops of the original SVG exports. The Review Partner Access screen (`review-partner-access.png`, 2000 × 819) is a raster export, so it is never shown wider than 1000px.

## Other case studies

- **Operation Safe Escape:** six chapters (Context, Constraints, Intake, Case workspace, How it connects, Outcome). Uses the phone sequence for mobile intake, an overview-plus-detail crop for the dashboard, and a larger image-beside-text for messaging.
- **Brilliant Cities:** four chapters (Context, Constraints, Key decisions, Outcome). It's a mobile product, so the hero is a row of four phone screens and decisions pair one phone with text. No How it connects chapter, because the decisions already follow the journey.
- **Anda:** six chapters (Context, The data, Roadmap, Key decisions, Team output, Outcome). A PM project, so it leads with the data sources and roadmap tiers, and every screen credits the designers.
- **Terraform:** seven chapters (Context, Audit, Research, Explorations, Key decisions, System, Outcome). Context and the password gate are public; the rest lives in `api/terraform-locked.fragment.html` and is added after unlock. Locked chapters show in the sidebar with a small lock and point to the gate until they arrive (`data-np-href`). Chapter ids are prefixed `tf-` so the older Terraform stylesheet doesn't restyle them. The original page and fragment are saved in `_artboards/cs/terraform-*.orig.html`.
- **ROAM:** a short preview with two chapters (Opportunity, What we designed). It uses the shared hero (spec block with a Problem row; no My contribution yet) and the Brilliant Cities phone pattern: three numbered features, each a phone beside its text, alternating sides.
