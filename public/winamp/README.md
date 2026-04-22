# Beanamp mini-player assets

- **`miniplayer-bg.png`** — full-bleed background for the bottom-right Beanamp mini player.
  Recommended framing: subject face weighted right, ~900–1200px wide, landscape. The CSS
  sets `background-size: cover; background-position: right 25% center;` so the face lands
  behind the right-side readouts (same slot Mr Bean sits in on the reference Winamp skin).
- Replace this image to change the player's "character". Keep a clean photo (no overlaid
  UI chrome from other players); the Winamp-style controls are rendered by our own CSS.

## Asset ownership / demo use

The headshot currently shipped here is a public hackathon joke frame and is used with
team approval for the **mixtAIpe** demo UI only. Swap it for any team-approved replacement
before external distribution.

## Skin lineage

The on-screen chrome is a **CSS/HTML homage** to the classic Winamp 2.x "main window"
(inspired by the "Mr Beanamp" skin concept). We do **not** redistribute any `.wsz` binary
or original skin bitmaps; the look is reimplemented in our own CSS under `.beanamp*` in
`app/globals.css`.
