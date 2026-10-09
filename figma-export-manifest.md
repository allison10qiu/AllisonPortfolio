# Figma import manifest

Capture the real pages. Add `?figma=1` to each local URL before importing. That query hides Ask Alli, parks homepage walkthroughs on the opening frame, pauses videos at 0, keeps marquees on the first set of items, and scrolls product mockups to the top. Leave it off for normal browsing.

Desktop width is 1440. Mobile width is 390. The phone layout in CSS starts at 640px wide, so 390 is inside that layout. The homepage and about column is 1080px wide inside the 1440 frame.

The dev server is already serving these URLs:

```
python3 scripts/dev-server.py --host 127.0.0.1 --port 8766
```

Heights below are the full document height, measured in a 1440×900 desktop window and a 390×844 phone window. Compare the imported Figma frame to these numbers. A frame that is only about 900px or 844px tall stopped at the window.

## Homepage

- Local URL: http://127.0.0.1:8766/?figma=1
- Production URL: https://www.allisonqiu.com/
- Desktop width: 1440
- Mobile width: 390
- Full height at 1440: 3048px
- Full height at 390: 3341px
- Interactive: five homepage walkthroughs (Terraform browser, Anda browser, Operation Safe Escape browser, NABU browser, Brilliant Cities phone). Each plays a cursor across later screens. Ask Alli sits on the corner. Cards lift on hover.
- Pause or hide for import: `?figma=1` hides Ask Alli and the walkthrough cursors, and holds each card on its opening screen.

## About

- Local URL: http://127.0.0.1:8766/about?figma=1
- Production URL: https://www.allisonqiu.com/about
- Desktop width: 1440
- Mobile width: 390
- Full height at 1440: 4366px
- Full height at 390: 5329px
- Interactive: Psi Eta Mu photo stack (01 / 04) and Hack4Impact photo stack (01 / 02). Arrow buttons, swipe, and wheel change the front photo. Ask Alli sits on the corner.
- Pause or hide for import: both stacks already open on photo 01. `?figma=1` hides Ask Alli.

## Terraform

- Local URL: http://127.0.0.1:8766/projects/terraform?figma=1
- Production URL: https://www.allisonqiu.com/projects/terraform
- Desktop width: 1440
- Mobile width: 390
- Full height at 1440: 2650px
- Full height at 390: 3366px
- Interactive: password gate. The public page is the problem, the scope line, and the gate. The rest of the case study is injected only after a correct password.
- Pause or hide for import: `?figma=1` hides Ask Alli. Leave the gate locked. Do not unlock it for the import.

## Anda

- Local URL: http://127.0.0.1:8766/projects/anda?figma=1
- Production URL: https://www.allisonqiu.com/projects/anda
- Desktop width: 1440
- Mobile width: 390
- Full height at 1440: 10179px
- Full height at 390: 13857px
- Interactive: horizontal preview strip. Scrollable browser frames for driver performance, vehicle activity, and revenue (once in the strip, again in the body).
- Pause or hide for import: `?figma=1` starts the strip at item 1, scrolls each browser frame to the top, and hides Ask Alli.

## Operation Safe Escape

- Local URL: http://127.0.0.1:8766/projects/operation-safe-escape?figma=1
- Production URL: https://www.allisonqiu.com/projects/operation-safe-escape
- Desktop width: 1440
- Mobile width: 390
- Full height at 1440: 8405px
- Full height at 390: 10611px
- Interactive: horizontal preview strip. Scrollable form-builder browser. Scrollable intake phone. Design-system video.
- Pause or hide for import: `?figma=1` starts the strip at item 1, scrolls the browser and phone to the top, pauses the video at 0, and hides Ask Alli.

## NABU

- Local URL: http://127.0.0.1:8766/projects/nabu?figma=1
- Production URL: https://www.allisonqiu.com/projects/nabu
- Desktop width: 1440
- Mobile width: 390
- Full height at 1440: 8795px
- Full height at 390: 10626px
- Interactive: horizontal preview strip. Scrollable visualization-builder browsers. Design-system video.
- Pause or hide for import: `?figma=1` starts the strip at item 1, scrolls those browsers to the top, pauses the video at 0, and hides Ask Alli.

## Brilliant Cities

- Local URL: http://127.0.0.1:8766/projects/brilliant-cities?figma=1
- Production URL: https://www.allisonqiu.com/projects/brilliant-cities
- Desktop width: 1440
- Mobile width: 390
- Full height at 1440: 8194px
- Full height at 390: 15520px
- Interactive: horizontal phone marquee. Scrollable phones for goal categories, the family dashboard, and the Number Sense habit. Design-system video.
- Pause or hide for import: `?figma=1` holds the marquee on the first group, scrolls those phones to the top, pauses the video at 0, and hides Ask Alli.

## What a webpage importer will clip

These regions scroll or fade inside their own frame. An importer records the visible box, not the rest of the asset.

- Homepage walkthroughs. One opening screen per card. Later screens and the cursor are not in that frame.
- About carousels. The front photo, plus a sliver of the neighbors. Photos 02–04 of Psi Eta Mu and photo 02 of Hack4Impact are not full frames.
- Horizontal strips on Anda, NABU, and Operation Safe Escape, and the Brilliant Cities phone marquee. The items that fit in the window, with a fade at the left and right edges. Items past that window are clipped.
- Scrollable browsers (16:10 window): Anda driver, vehicle, and revenue screens; NABU visualization steps; Operation Safe Escape form builder. The image continues below the window.
- Scrollable phones: Operation Safe Escape intake; Brilliant Cities goal categories, family dashboard, and Number Sense habit. The image continues below the phone window.

## Assets

Public SVG, PNG, WebP, the three design-system videos, the seven Satoshi files, and the homepage walkthrough images all returned successfully from the local server.

These stay closed without a password, and an importer will not receive them:

- `/api/terraform-audit` (the Terraform audit video) returns 401
- `/api/terraform-locked.fragment.html` is not served
- `/api/terraform-private/` is not served
