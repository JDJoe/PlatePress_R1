# Plate Press — UI help

One book at a time. ComfyUI must already be running. This app does not download the checkpoint.

Also in the app: **Help** tab. The header always shows the open book.

## Loop

1. Settings — pick a style card, Test connection.
2. Cast — this book’s people. Optional stills.
3. Book — paste the labeled shot wall. Parse. Generate.
4. Queue — watch the plates. Captions and balloons are in the picture if the **letter** column was on at Generate. Same size as the plate.

## Settings

INK (Style), layout, closer, NEG, UNET, LoRAs, sampler, and images-per-plate belong to the **open book**. Comfy host, port, and model folders stay in shared Settings. Save settings writes INK (Style) and weights onto this book. **Publish** stores a snapshot in that folder. **Load published** puts it back; missing UNET/LoRA names warn and the rest still loads.

- **Test connection** first.
- **Style cards are the mode.** There is no separate Plate layout radio.
- **Bos, one plate**: each slug is one image. If that slug contains `left pane:` / `right pane:`, only that plate splits.
- **Two-pane comic**: consecutive slugs share one image (p1 left, p2 right). Do not write “Left pane” yourself. Each pane is its own scene as written.
- Click a card to fill ink, layout line, and matching negatives, and save Settings. World closer stays empty on Bos; two-pane fills the pane closer. The boxes stay editable.
- **INK** (Style) and **Layout line** are prepended to every plate. They live on this book. An empty INK (Style) box is refused and the factory style is put back.
- **World closer** is empty on Bos. Two-pane fills “each pane is its own scene…”. Prepended only if that box has text.
- **NEG** is the negative prompt. It is written only if the API graph has a CLIP negative node. The shipped default keeps its own diptych negative.
- Stills and locks are **Text** / **Image** on the Book table, not Settings. **Cutout** is per character on Cast.
- **Model and LoRAs** — **Load lists from Comfy** and pick the exact UNETLoader name. Combo name is the listed folder plus the listed file (`KREA2/krea2_turbo_bf16.safetensors`). Softlinks keep those names. Must be a Krea 2 UNET. Saved on this book with Save settings. Comfy host, port, and model folders stay in shared Settings.
- Do not touch sampler unless you mean it. Factory: 8 steps, CFG 1, euler, beta.

API graph: `default_comfyUI-API.json` (text and stills; Qwen encode + ReferenceLatent when a still is on; unused LoadImage nodes are dropped). **Per book:** open that default in Comfy, change nodes or parameters, **Save (API Format)**, drop the JSON in this book’s `workflows/` folder (or shared `platepress/workflows/`), pick it on the Book page. Extra nodes stay. The app still fills prompt, seed, Settings UNET/LoRAs, and the save prefix. The UI twin is `default_comfyUI.json`.

## Cast

- Cast is per book. Five books can all have ANDROID; they are not the same person.
- Header plus Cast, Book, Queue, and Settings headings show which book you are editing.
- Cast **Name** is the wall token: `ROOM`, `LAMP`, `ANYTHING`, `CHAR1`. Text on: that word becomes the Cast text substitution, `is Anna` stays. **Image** on (per slug): that card’s still is `image1`, the next token’s still is `image2`, then `image3`. `CHAR1` / `PILOT1` still mean first card, `CHAR2` second. `Anna` after `is` is writer text. Do not write `CHARACTER1` — Krea does not see it as a special character handle.
- Cast text should normally contain **persistent character identity**: age, face, hair, skin, body type, recognizable proportions, and permanent distinguishing features. Do **not** normally put scene-specific clothing, props, pose, expression, or environment in Cast text. Those belong in the slug unless genuinely permanent.
- A reference still is visual conditioning, not a perfectly isolated character channel. Prefer a clean identity reference: face/head, hair, and shoulders or upper chest when useful. Avoid temporary clothing, props, scenery, pose, or scene-specific composition when they are not meant to persist.
- **Lock seed** on a thumb in Queue, then later plates of that character can reuse it. **COMMENT: needs further investigation.**
- **Cutout** is a checkbox on the card. Cutout sentence is on the Cast page. It is sent only when that plate’s Image column is on.
- Do not put posing, standing, cute, helmet-hug, or looking over the shoulder in the Cast identity text. Current clothing, helmet state, pose, orientation, gaze, and other shot-specific details belong on the slug.
- A name like `PATRON` only works if that card exists on this book.
- 0–3 local stills per card. One body. Replace still on that card. Clean head/head-and-shoulders references are generally preferable for identity. Full-body references can carry clothing, pose, and composition into the result, so use them deliberately.
- Two-shots are allowed and flagged. Faces can fuse or strong visual features can bleed between characters.
- **Load demo cast** replaces this book’s roster, not a global list.

## Book

Story wall. Slug, then character tokens such as `CHAR1 is PingPong`, then reference/KEEP text if a still is being used, then whatever shot information the image needs. **Text**, **Image**, and **letter** start off.

A useful example is:

```text
p01_slug
CHAR1 is PingPong
KEEP the same woman from image1, her name is PingPong.
CAMERA: Medium side action shot.
LOCATION: Place, ground, weather or interior. Named objects.
ACTION: Caught in the instant of [verb].
GAZE: Eyes on a named thing in the frame.
HANDS: What both hands are doing.
MOTION: Body, boots, pack, debris, the beat.
```

These labels are **helpful structure, not a fixed Plate Press syntax**. They can be `CAMERA:`, `ROOF:`, `WHEELS:`, `BALLOON:`, or any other useful label the story needs. Plate Press passes the written prompt text on as-is. Consistent labels can make prompts easier to read, copy, search, compare, and debug, and may help keep related instructions grouped, but they are not required by Krea and should not be invented merely to fill a template.

- Slug on its own line (`p01_wreck`, `t1_one`). Two digits so p010 sorts after p001.
- Cast **name** is the token (`ANYTHING`, `ROOM`, `CHAR1`). New cards default to `CHAR1`, `CHAR2`. `CHAR1` / `PILOT1` = first card, `CHAR2` = second. **Text** on: token is replaced by that Cast card’s text and `is Anna` stays. **Image** on: stills upload as `image1`, `image2`, `image3`; `CHAR1 is Hans` becomes `image1 is Hans` unless Text is also on. **Both**: Cast text in the prompt plus those stills. Write KEEP / REFERENCE for `image1` (and `image2` / `image3`) yourself when you want the reference used.
- Do not paste ink, closer, sampler, or `LoRA trigger words` here. The app prepends ink and the layout line (and closer if that box is not empty).
- Camera, character orientation, and gaze need to be explicit when they control the composition. Give each character a concrete thing to look at when they should not face the viewer.
- For three or more characters, bind every important action and gaze instruction to a named character. Use names in the written scene description where possible.
- Working verb: **caught in the instant of [verb]**. Named actor, named object, named contact.
- Never describe a person as a shape, silhouette, smear, pale shape, or receding figure. Write a complete person and specify the intended framing. CAMERA is empty air — “a figure at the edge” can become an unwanted third person.
- Do not write “paint the plate.” Krea paints food. Factory Style says **Fill the frame**.
- Captions: same slugs, in the **Captions** box. Check the **letter** column so Generate paints them on the plate. Untagged lines become a bottom box (`CAP_B`). `CAP_T` is the top box. The plate does not grow.
- The default book is **The Book of Everything**. It cannot be deleted from the UI.
- **Parse** before generate. Slug checkboxes stay as you left them. Click a prompt (or Copy) to copy the full assembled text Comfy will get. A variant slug is `p09A_morning` (letter after the number).
- Header checkboxes: generate-select, Text, Image, letter.
- **Generate** (all / selected / missing) always Parses first. Generate selected uses the checked rows and always queues a new version. Skip only applies to Generate missing.
- Assembler: **ink, layout line, closer (if any), Book wall**. No KEEP line is added.
- Two-pane comic: one checked row uses the next slug as the right pane. Write a full shot on each slug.
- Default: 2 random seeds per plate.
- Caption tags (one per line). Speaker optional after the tag: `NS: Vex: Oh. There you are.` The name is who speaks (tail), not ink in the balloon. Krea lettering line: `Hand-lettered ink inside, Vex says exactly: "Oh. There you are."`
  - Place the balloon in a cell: `NS_6: PILOT2 suggested selling them.` Grid, top to bottom:
    `1 2`
    `3 4`
    `5 6`
  - Left column is odd (1, 3, 5), right is even (2, 4, 6). Tail points down in that cell.
  - `NS` normal oval speech · `NSV` vertical · `NS2` two connected balloons (`first | second`) · `OFFP` off-panel
  - `YELL` burst · `FADE` weak · `WHISP` dashed whisper · `ANN` starburst announcement
  - `THINK` oval thought · `DREAM` cloud · `DARK` black balloon, white letters
  - `CAP_B` rectangular caption box at the bottom · `CAP_T` at the top
- **Copy instructions for your LLM** copies the shipped sheet plus this book’s Cast identity notes (as identity notes, not as a prompt prefix).

Metaphor examples: spiderweb of black cells; wet silk into teal glass; stained glass; gold leaf over black glass; liquid silver; fire-silk; enamel. Hang a metaphor on a **named object**. Vessels are **spacecraft** — `ship` makes Krea paint boats.

## Refs

- Per slug **Image** column, not a Settings switch. Tokens on that slug map to stills in order: first token → `image1`, second → `image2`, third → `image3` (`CHAR1` / `ROOM` / `ANYTHING` all count). No token on the wall → no still, even if Image is on.
- **Generate** (all / selected / missing) always Parses first.
- Text off + Image on: `CHAR1 is Hans` becomes `image1 is Hans` (CHAR2 → `image2`). Stills upload as `image1`…`image3`. Write KEEP/REFERENCE yourself.
- Reference images can influence more than identity. They may carry clothing, pose, composition, or camera distance into the result. A practical finding from testing is that wide shots can sometimes work better with the reference **off** when facial identity is not important.
- Clean head/head-and-shoulders references are generally preferable for identity. Full-body costume references can be useful when you intentionally want the costume to persist, but they can also carry unwanted visual information.
- Frontal “look at me” stills can encourage that pose. Use a deliberately composed identity reference when possible.
- Cutout is per Cast card. Prefer writing REFERENCE on the wall.

## Queue / Letter

- This page shows only the open book. Click a thumb to view it larger (Esc or click the dark to close).
- File names (hyphens, no spaces):
  - `P01-wreck-v01-same-clouds.png`
  - two-pane pair: `P01-cargo-P02-claim-v01-bos.png`
  - second seed: `P01-wreck-v01-same-clouds-2.png`
  - lettered copy: `P01-wreck-v01-same-clouds-lettered.png`
- Each Generate is a new version (v01, then v02) with its own grid, newest on top. Files sort by plate (`P01` then `P02`). No seed in the name.
- Thumbs land in the book `plates/` folder.
- **Letter all** / **Letter this** is optional extra drawing on a copy. The usual path is Generate with the letter column on.
- **Export pack** writes lettered PNGs, `captions/`, `assembled_prompts.txt`, `seeds.json`.
- Reroll = new seed from the current Book wall (saves first), not the old file. New version.
- **Publish**: pick thumbs (or a whole version), then Publish. Files move to `01_BookName_Published` with a snapshot of ink, LoRAs, story, and captions. **Load published** restores that snapshot. **Delete all plates** does not touch published folders.
- Delete one file, earlier versions, or all plates in this book (story/stills stay). Published folders stay.
- Settings → Books: new book, open, delete whole folder (not default).

## House style

- No text, logos, balloons, or “comic panel with text box” in the sampler.
- No NASA, EMU, flags, patches — those pull a different suit.
- Use as many characters as the scene actually needs. Three-character scenes are supported, but multiple active references can mix strong visual attributes, so use them deliberately.
- Do not change identity words mid-book.
- Vessels are spacecraft. The word ship (and spaceship) makes Krea paint boats with sails.
