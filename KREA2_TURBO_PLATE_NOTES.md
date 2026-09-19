# PlatePress V2 — Krea 2 Character Reference & Prompting Findings

## Purpose

These rules are for the LLM that writes image-generation prompts from a story/slug for **PlatePress V2 → Krea 2 Turbo**.

The goal is **character consistency without unnecessarily constraining the scene**.

The most important distinction is:

> **PlatePress CHAR tokens are substitutions when Text is on. They are NOT character handles that Krea sees.** Text off, Krea sees `CHAR1 is Solace`.

And the practical division is:

> **REFERENCE = (STYLE) visual identity when the reference is activated.**  
> **CAST TEXT = permanent identity information.**  
> **SLUG TEXT = what the character is wearing, doing, holding, looking at, and where they are in this shot.**

---

Prompts are on one long text wall (or a txt file) 
```text
P001_name

Prompt text... 

P002_name

Prompt text... 
```

Second text wall is captions

```text

P001_name

Caption text... 

P002_name

Caption text... 
```


Good prompt structure: 

```text
p014_the_sample 

CHAR1 is Solace. KEEP the same woman from image1, her name is Solace. She is now in a white slim-fitting body suit with no helmet.
CHAR2 is Veyra. KEEP the same woman from image2, her name is Veyra. She is now in worn-out suede lederhosen and brown boots.
CHAR3 is Hans. KEEP the same man from image3, his name is Hans. He is now in a leather jacket, jeans, and black boots. 

CAMERA: WIDE CINEMATIC SHOT, camera pulled well back from the characters.
The characters occupy only approximately 50% of the image height.
Substantial environment surrounds them on all sides.
Do not use a close or medium framing.

They stand together in the artificial paradise surrounded by clear water, green grass, trees, flowers and distant mountains. Sky looks dark, oily and almost like bubbling and melting. 
Thin black slimy threads in the grass. Beautiful flower has turned completely black.
Solace, Veyra and Hans, are all looking down directly at the black flower in front of them.
MOOD: Everyone is scared.  


p015_it_brought_us 
CHAR1 is Solace. KEEP the same woman from image1, her name is Solace. She is now in a white slim-fitting body suit with no helmet.
CHAR2 is Veyra. KEEP the same woman from image2, her name is Veyra. She is now in worn-out suede lederhosen and brown boots.
CHAR3 is Hans. KEEP the same man from image3, his name is Hans. He is now in a leather jacket, jeans, and black boots. 

CAMERA: wide shot from behind the three characters, showing the spreading black infection across the paradise and the enormous indistinct shape moving behind the distant mountains and in the sky. 

Thin completely black threads made from unknown exotic material have spreads through the grass, between the trees and across the ground and in the sky. All flowers have turned completely black. 
Solace, profile, most of her face hidden, watches the spreading darkness in the sky. 
Veyra, in profile, most of her face hidden, looks across the infected landscape. 
Hans stands beside them with his mechanical right arm visible and looks down at the spreading black material on the ground. 
```


## 1. CRITICAL: CHAR1 / CHAR2 / CHAR3 are PlatePress substitution tokens

`CHAR1`, `CHAR2`, `CHAR3`, or `PILOT1` etc. are **PlatePress substitution tokens**.

They are replaced by the corresponding Cast-page text **only when the Book table Text column is on for that slug**. Image on sends stills (`image1`…`image3`); it does not substitute Cast text. Text off, Krea really sees `CHAR1 is Solace`.

For example, if the Cast page contains:

```text
CHAR1:
A beautiful supermodel like tall blond female in her mid-twenties with slim fit body.
```

and the slug contains:

```text
CHAR1 is Solace.
```

With **Text on**, Krea does NOT see:

```text
CHAR1 is Solace.
```

It sees something approximately like:

 
```text
A beautiful supermodel like tall blond female in her mid-twenties with slim fit body is Solace.
```


Every occurrence of `CHAR1` in the slug is replaced in the same way (Text on). Text off, the token stays.

### Why this matters

The LLM must write prompts with the substitution behavior in mind.

Do not reason about `CHAR1` as if it remains a compact handle inside the final Krea prompt.

The Cast description is injected literally wherever the token occurs.

Therefore:

- Cast descriptions should be concise enough to survive literal insertion.
- Cast descriptions should contain **identity**, not scene-specific clothing.
- Repeating `CHAR1` multiple times can inject the full description multiple times. Don't do it. 
- A long Cast description can dominate the resulting prompt.

This substitution behavior should be treated as a core PlatePress rule.

---

## 2. What belongs in the Cast description

The Cast description should normally contain **persistent character identity**.

Good Cast information:

- age
- sex / gender presentation
- face
- hair
- skin
- body type
- recognizable proportions
- permanent physical characteristics
- permanent distinctive features

Example:

CHAR1:
```text
A beautiful supermodel like tall blond female in her mid-twenties with slim fit body.
```

CHAR2:
```text
Green human-like creature in her late thirties. Perfect smooth emerald skin,
wide gold-amber eyes, small pointed ears, small fangs, two ridged horns curving
back, long black hair, feminine hourglass body, thin waist, narrow hips,
long supermodel legs.
```

CHAR3:
```text
Good looking happy German guy in his thirties with blond hair and a mechanical right arm.
```

### Do NOT normally put changeable scene information in Cast

Avoid putting these in the Cast description unless they are genuinely permanent:

- shirts
- jackets
- pants
- boots
- spacesuits
- armor
- lederhosen
- underwear
- current equipment
- current props
- current pose
- current expression
- current environment

For example, if Hans wears lederhosen in one scene and a spacesuit in another, **lederhosen belongs in the scene prompt, not the Cast description**.

Otherwise every `CHAR3` substitution injects both lederhosen and the new clothing into Krea.

---

## 3. Permanent unusual features need special care

Permanent features can belong in Cast text and/or a reference.

Examples:

- cybernetic limb
- prosthetic
- distinctive scar
- tattoo
- unusual ears
- horns
- distinctive hair
- permanent facial feature

However, a **very visually strong feature can leak between characters when multiple reference images are active**.

A cybernetic arm is a good example.

If Hans's reference contains:

```text
face + large mechanical arm
```

Krea may strongly associate the arm with the combined multi-character visual conditioning and occasionally attach it to another character.

Therefore, for multi-character workflows:

> **A permanent feature is identity information, but it does not automatically have to be shown in the image reference.**

For a strong distinctive feature such as Hans's cybernetic arm, a useful test is:

```text
REFERENCE → Hans's face/head only
CAST TEXT → blond man + permanent mechanical right arm
```

This separates facial identity from a visually dominant body feature.

---

## 4. Character references should be identity references

For human-like characters, the preferred reference is a **clean isolated identity reference** rather than a complete scene depiction.

Useful contents:

- face
- hair
- head
- shoulders / upper chest if useful
- permanent distinguishing physical features that are safe to preserve

A head-only reference can work very well. Head + shoulders/upper chest may provide additional identity information when needed.

### Avoid scene baggage

Unless deliberately permanent, remove:

- clothing
- underwear
- jackets
- uniforms
- boots
- weapons
- props
- objects being held
- environment
- scenery
- furniture
- temporary pose
- scene-specific lighting
- scene-specific composition
- background (use clear smooth white)

The goal is to tell Krea:

> **This is who the character is.**

not:

> **Reproduce this entire picture whenever this character appears.**

---

## 5. Reference activation should depend on the shot

Do **not** automatically activate the character reference for every shot.

A practical rule from testing is:

### Wide / distant shot

If a character is small in frame and facial identity is not important, **text-only can be preferable**.

The Cast description establishes the character while avoiding unnecessary visual conditioning from the reference.

### Close / important shot

When the character is close enough that facial identity matters, activate the reference and use explicit preservation language.

The only KEEP form:

```text
KEEP the same woman from image1, her name is PingPong.
```

Example:

```text
KEEP the same man from image1, his name is Hans. He is now in a tavern.
```

Do **not** write `KEEP everything`. Do not replace KEEP with “Preserve exact facial identity…”. List what to keep *after* the subject, then the new situation (`she is now in …`).  


Use the reference when the visual identity needs to be preserved strongly, rather than stuffing the reference into every shot.

When a still is on, Krea copies pose unless you fight it. Add:

```text
POSE IS NEW. Do not copy image1 pose, hands, or camera.
```

REFERENCE should ignore background, pose, and setting unless those are wanted.

---

## 6. Preserve identity with the reference; describe the current scene with text

When a reference is active, the reference establishes the visual identity.

The prompt then describes what changes for this shot.

Example:

```text
KEEP the same woman from image1, her name is Solace. She is now in a white slim-fitting body suit with a clear bubble helmet.
```

The important principle is:

> **Preserve identity with the reference; modify the current scene with text.**

Do not repeatedly rebuild the entire character from scratch when the reference already provides the identity.

---

## 7. Preserve only the scope that is actually wanted

One KEEP form. Never `KEEP everything` — that freezes background, clothes, pose, and room.

```text
KEEP the same woman from image1, her name is PingPong.
```

List only what must survive. Then the new situation. Omit clothes from the keep-list if this slug changes the costume.

---

## 8. Clothing is scene information

Clothing normally belongs in the slug, because clothing can change from shot to shot.

Example Cast:

CHAR1:
```text
A beautiful supermodel like tall blond female in her mid-twenties with slim fit body.
```

Example scene:

```text
Solace is wearing a white futuristic slim-fitting body suit with a clear bubble helmet.
```

This keeps the character identity separate from the current costume.

The same character can then become:

```text
Solace is wearing a damaged orange flight suit.
```

or:

```text
Solace is wearing a black pressure suit.
```

without changing the Cast identity.

---

## 9. Each slug is effectively stateless

A later slug should **not assume Krea remembers what happened in the previous slug**.

If p001 established:

- white spacesuits
- crashed spacecraft
- alien planet
- a particular object
- a particular location
- a particular physical situation

p002 must describe whatever of those facts is needed for p002.

Do not write:

```text
They continue repairing the ship.
```

if Krea needs to know that the ship is crashed and half-buried.

Instead write:

```text
Solace, Veyra and Hans are beside their crashed, half-buried spacecraft.
Hans kneels beside the exposed engine and repairs it...
```

[comment]: # ( When reference reference images are used, "beside their crashed, half-buried spacecraft", it will bury the characters too. It's better to describe what characters are doing and then put the ship somewhere. )


The story may be continuous, but the image-generation prompts are effectively independent shots.

---

## 10. CAMERA is important

Camera/composition is not optional fluff.

Without camera direction, Krea can default toward a generic character portrait or a group of people facing the viewer — the dreaded **space selfie**.

Use camera language when it affects the shot:

```text
CAMERA: wide establishing shot.
CAMERA: medium shot.
CAMERA: close-up.
CAMERA: high angle, looking down.
CAMERA: low angle, looking upward.
CAMERA: over (left/right) Solace's shoulder, (half her face visible etc)
CAMERA: behind Hans.
CAMERA: three-quarter view.
```

Useful camera information includes:

- shot size
- camera height
- camera angle
- viewing direction
- foreground/background relationship
- over-the-shoulder viewpoint
- whether the camera is behind, beside, above, or below a character

Do not describe camera parameters merely for the sake of filling a template. Use them when they control the visual composition.

**Camera is empty air.** It is not a body arriving.

Bad: “leans in from the far side,” “a figure at the edge,” “someone over her shoulder” when you meant the lens.

Good: “We stand at X looking at Y. The people in frame are A and B only.”

“We stand” is fine for CAMERA. It is not fine if you then imply a third body occupies that spot.

---

## 11. Character presentation is separate from camera

Camera position and character orientation are related but not identical.

Useful character-presentation instructions include:

```text
Solace is in profile.
Veyra is seen from behind.
Hans is shown in three-quarter view.
Only half of Solace's face is visible.
Hans has his back to the viewer.
```

This is particularly important when the characters should **not** look like they are posing for a portrait.

---

## 12. Gaze must be explicit

If a character should not look at the viewer, give them a **specific thing to look at**.

Weak:

```text
Veyra examines the area.
```

Better:

```text
Veyra looks directly down at the strange alien machinery on the ground in front of her.
```

Better:

```text
Veyra, in profile, looks directly up at the flying insectoid creatures.
```

Likewise:

```text
Solace looks down at the alien plant.
Hans looks directly at the damaged engine.
```

A final instruction such as:

```text
None of them looks at the viewer.
```

can reinforce the intent, but it is stronger when combined with concrete gaze targets.

---

## 13. Bind every action to a specific character

With three or more characters, every important action should be clearly attached to one person.

Good:

 [comment:] (this is weak, I added "looks up", "in profile" + plants location) 
 
```text
Veyra looks up and points at the sky.
Solace, in profile, examines the plant on her left.
Hans kneels beside the spacecraft.
```

Bad:

```text
One woman points upward while another examines the plant.
```

Use names in the written scene description when possible.

**ACTION is one beat.** Named actor, named object, named contact. One instant. Do not stack three verbs. Do not describe the last panel and the next in one line.

```text
Caught in the instant Solace holds the chrome coupling in her right hand and seats it into the hull port.
```

Not: “the tip finds the port.” Name the object and the hand that owns it, or Krea attaches the tool to the wrong body part.

**HANDS.** Count them. Two people in frame → four hands, or say which are out of frame. A mystery hand becomes a mystery person.

### Important PlatePress distinction

Names are useful **inside the generated prose**, but `CHAR1` itself is not a name/handle to Krea. PlatePress replaces it before Krea receives the prompt.

Therefore the prompt-writing LLM must understand both levels:

```text
PlatePress layer:
CHAR1

Krea layer:
A beautiful supermodel like tall blond female... is Solace.
```

---

## 14. Adding objects is easier than removing inherited objects

A recurring practical observation is that Krea handles **adding** visual elements more reliably than removing things strongly represented in a reference.

Therefore:

- Do not put temporary props into identity references.
- Do not put changeable clothing into identity references.
- Do not put scene environments into identity references.
- Do not put temporary poses into identity references.

If the character needs a scanner in one shot, add it in text.

If the character needs different clothing in the next shot, add the new clothing in text.

---

## 15. Multi-character reference contamination

Three-character scenes are a particularly important stress case.

When multiple reference images are active, Krea can preserve the general identities while still mixing strong attributes between characters.

Observed example:

> Hans has a distinctive mechanical arm.

When Hans's full reference showed the mechanical arm, Krea sometimes attached a mechanical arm to Solace or another character.

This suggests that multiple references should not be assumed to behave like perfectly isolated character channels.

### Practical response

For a strong permanent feature:

1. Keep the character's identity reference visually simple.
2. Consider moving the distinctive feature into Cast text.
3. Activate the reference image only when identity needs it.
4. Explicitly describe the feature in the scene when it must be visible.

This is an empirical PlatePress/Krea finding, not a claim that Krea officially documents the behavior this way.

---

## 16. Example: three characters in a wide shot

If **Text** is on (Cast text substitution) and Image/stills may be off, the Cast descriptions are expanded directly into the prompt.

Conceptually:

```text
CHAR1 is Solace.
CHAR2 is Veyra.
CHAR3 is Hans.
```

may reach Krea as something like:

```text
A beautiful supermodel like tall blond female in her mid-twenties with slim fit body is Solace.
Green human-like creature in her late thirties... long supermodel legs. Veyra...
Good looking happy German guy in his thirties with blond hair and a mechanical right arm is Hans...
```

Then the shot description specifies:

```text
CAMERA: wide establishing shot, high angle, camera above their heads and pointing down.

Veyra, in profile, looks up at distant flying insectoid creatures and points toward them.
Solace, in profile, looks down at a strange alien plant beside her.
Hans sits beside the crashed spacecraft with his back to the viewer and examines the damage.
```

The exact prose can vary. The important thing is that the Cast text is being literally substituted.

---

## 17. Example: three characters in a close shot

When references are activated:

```text
CHAR1 is Solace. KEEP the same woman from image1, her name is Solace. She is now in a white slim-fitting body suit with a clear bubble helmet.
CHAR2 is Veyra. KEEP the same woman from image2, her name is Veyra. She is now in the same white suit and helmet.
CHAR3 is Hans. KEEP the same man from image3, his name is Hans. He is now in the same white suit and helmet.
```

Then specify current appearance and action:

```text
Solace is now wearing a white futuristic slim-fitting body suit with a clear bubble helmet.
Veyra is now wearing a white futuristic slim-fitting body suit with a clear bubble helmet.
Hans is now wearing a white futuristic slim-fitting body suit with a clear bubble helmet.

CAMERA: close group shot from a low angle.

Veyra looks directly at the black object.
Solace, in profile, looks at the same object.
Hans looks toward the alien machinery.
```

The reference establishes identity; the slug establishes the current shot.

---

## 18. STYLE should describe visual treatment, not scene content

STYLE should describe the visual language.

Example:

```text
aethernouveau. Ink and watercolor by Moebius, thin black outlines,
muted ochre, rust, teal and black. Cream paper is the print stock,
not the sky. Fill the frame, no bare sheet, no white void.
```

Avoid forcing generic environment content into STYLE, such as:

- ground
- horizon
- sky
- mountains

when those things are not always wanted.

For example, a generic “real sky / horizon / ground” instruction can interfere with an interior or space scene.

---

## 19. Lettering is separate

Lettering is **not** part of the shot wall. Put tags in the **Captions** box (same slugs as the shots). Turn the Book table **letter** column on so Generate appends the balloon instructions. A `NS:` line on the shot wall is only more prompt text — no balloon.

┌───────┬─────────────────────────────────────────┐
│ Code  │ Shape                                   │
├───────┼─────────────────────────────────────────┤
│ NS    │ Normal oval speech                      │
├───────┼─────────────────────────────────────────┤
│ NSV   │ Vertical oval                           │
├───────┼─────────────────────────────────────────┤
│ NS2   │ Two connected balloons (first | second) │
├───────┼─────────────────────────────────────────┤
│ OFFP  │ Off-panel, tail to the edge             │
├───────┼─────────────────────────────────────────┤
│ YELL  │ Spiky burst                             │
├───────┼─────────────────────────────────────────┤
│ FADE  │ Weak / fading                           │
├───────┼─────────────────────────────────────────┤
│ WHISP │ Dashed whisper                          │
├───────┼─────────────────────────────────────────┤
│ ANN   │ Starburst announcement                  │
├───────┼─────────────────────────────────────────┤
│ THINK │ Oval thought                            │
├───────┼─────────────────────────────────────────┤
│ DREAM │ Cloud daydream                          │
├───────┼─────────────────────────────────────────┤
│ DARK  │ Black balloon, white letters            │
├───────┼─────────────────────────────────────────┤
│ CAP_B │ Caption box, bottom                     │
├───────┼─────────────────────────────────────────┤
│ CAP_T │ Caption box, top                        │
└───────┴─────────────────────────────────────────┘

```text
NS: Solace : We should sell them. 
```

— tail points at Solace. Without the second colon, the whole line is lettered inside the balloon.

```text
NS: Solace We should sell them. 
```
Normal oval speech with: "Solace We should sell them" 

---

## 20. Recommended prompt structure


A useful general structure is:

```text
(STYLE, if not set)
[CHARACTER IDENTITY / REFERENCE PRESERVATION — only when needed]

[CURRENT CLOTHING / APPEARANCE — only when needed]

[CAMERA / COMPOSITION — when important]

[CHARACTER PRESENTATION / ORIENTATION — when important]

[ACTION / GAZE — when important]

[SCENE / ENVIRONMENT]
```

Lettering goes in the **Captions** wall (same slug), not in this shot block. Turn **letter** on for that slug.

These sections are conditional.

Do not fill every section merely because it exists.




---

## 21. Core decision rule

When deciding where information belongs, ask:

> **Is this part of who the character permanently is, or is it something that can change from shot to shot?**

If it is **persistent identity**:

```text
CAST TEXT and/or REFERENCE
```

If it is **current scene information**:

```text
SLUG TEXT
```

If it is **strong visual identity and the shot is close enough for it to matter**:

```text
ACTIVATE REFERENCE
+ KEEP the same woman from image1, her name is PingPong.
```

If it is **a distant/wide shot where facial identity is not important**:

```text
REFERENCE MAY REMAIN OFF
+ use CAST TEXT
```

In shorthand:

```text
CAST → permanent identity
REFERENCE → visual identity anchor
SLUG → current shot
CAMERA → viewpoint/composition
GAZE → attention target
```

---

## 22. The current PlatePress/Krea working model

The most useful mental model is:

> **PlatePress writes the shot. Krea does not know the previous shot.**

And:

> **CHAR tokens are expanded before Krea sees the prompt — when Text is on.**

And:

> **References are not magical isolated character slots. Multiple references can interact.**

Therefore:

### Cast page

Keep it **short, permanent, identity-focused**.

### Reference image

Keep it **clean and identity-focused**.

### Slug

Describe **this shot**, including clothing, props, pose, camera, orientation, gaze, action, and required environment.

### Reference activation

Use it when the character is visually important enough that preserving the face/identity is worth the additional conditioning.

---

## 23. Language that melts a person

Do not describe a person as: shape, form, figure, mass, silhouette, blur, smear, suggestion, pale shape, receding figure.

“Recedes as a pale shape in the corner” melts them into a blob of limbs.

Write: complete person, intended framing, in focus, face readable when the face matters.

“Exactly N people. Name them. No extra person. No extra arm. No extra torso at the edge.”

---

## 24. When a plate fails

Do not rewrite the episode. Change one of: **CAMERA**, **ACTION**, **HANDS**. Reroll that slug.

Usual causes:

| Symptom | Likely cause |
|---|---|
| Wrong room | Place unnamed or too short |
| Same pose every shot | Still winning; POSE IS NEW missing |
| Object changes | Prop not named; no hand on it |
| Extra person | “far side,” “over the shoulder,” uncounted hands, camera written as a body |
| Person melts | shape / blur / silhouette / recedes |
| Object becomes a body part | Vague “tip / shaft / end” without a named handheld tool |

LOCATION is useful when the room must not wander. It is not required on every slug. An unnamed room can become desert; a `Blah` slug can still make a landscape. Use a place stamp when the place matters.

Optional sci-fi stamps when they matter: same suit, helmet held/worn/racked or `NO HELMET`, named practical lights, `No crowd. No extra crew in the hatch.` Treat an important object like a named token (`ROOM is the suite`) if it must persist. If it should be gone: say so on that slug.

---

## 25. Empirical basis / confidence

These rules are based primarily on observed PlatePress/Krea 2 Turbo testing.

Observed patterns include:

- Clean isolated character references reduce unwanted clothing/environment inheritance.
- Head or head/upper-body references can work well as identity anchors.
- Text is effective for changing clothing, adding objects, specifying actions, and controlling the current scene.
- Full scene references can carry unwanted clothing, props, pose, and environment into later shots.
- Strong visual attributes can leak between characters when several references are active.
- A distinctive cybernetic limb is a particularly useful stress test for multi-character reference contamination.
- Wide shots can work well without activated character references when facial identity is not visually important.
- Close shots benefit more from activated identity references.
- Camera direction materially affects composition and helps prevent generic “group portrait” results.
- Explicit character orientation and concrete gaze targets help prevent characters from facing the viewer.
- Later slugs must repeat visual facts they need because the image-generation prompt should be treated as effectively stateless.

These are **practical findings for the PlatePress workflow**, not claims that Krea officially recommends every rule above.

---

## 26. The shortest version

If this entire document has become too long and everybody has forgotten why we are here by the end, remember these six rules:

```text
1. CHAR1 / CHAR2 / CHAR3 are PlatePress substitution tokens.
   Text on: replaced by Cast text before Krea sees the prompt.
   Text off: Krea sees CHAR1 is Solace. Image on sends stills, not Cast text.

2. CAST = permanent character identity.
   Do not put changeable clothing or scene details there.

3. REFERENCE (image) = identity anchor.
   Prefer clean, isolated references.

4. SLUG = this particular shot.
   Describe current clothing, props, pose, action, environment, etc.
   Repeat important details in every slug that needs them.

5. CAMERA + ORIENTATION + GAZE matter.
   They control the shot and stop the characters from becoming selfie models.
   Camera is empty air. Count the hands. One ACTION beat.
   POSE IS NEW when a still is on.

6. Use references when identity matters.
   For distant/wide shots, text-only may be better.
   For close shots, use:
   KEEP the same woman from image1, her name is PingPong.
   If a plate fails, change CAMERA or ACTION or HANDS and reroll that slug.
```

> **IDENTITY → CAST / REFERENCE**  
> **CURRENT SHOT → SLUG**  
> **VIEWPOINT → CAMERA**  
> **ATTENTION → GAZE**
