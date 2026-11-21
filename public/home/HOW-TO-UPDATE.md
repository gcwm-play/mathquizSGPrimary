# Updating the GCWM Play home page

Live at **https://gcwm-play.github.io/mathquizSGPrimary/home/**

Everything on the page comes from one file: `public/home/projects.json`.
You never need to touch `index.html` to add, hide or reorder games.

## Admin page (easiest)

Open **https://gcwm-play.github.io/mathquizSGPrimary/home/admin.html** (also linked as "Manage" in the page footer).

- Show or hide a tile with the eye icon, put it in the spotlight with the star, and reorder by dragging the handle or using the arrows.
- Click a tile to edit its title, summary, links, category, tags, colour and date, or drop in a new screenshot (it's cropped to 16:10 and saved as WebP).
- "Add tile", "Duplicate" and "Delete tile" do what they say. "Site text & categories" edits the heading text and the filter chips.
- Press **Publish** (or Ctrl/Cmd+S). It saves everything as one commit, and the live page updates in about two minutes.

The first time, click **Connect GitHub** and paste a fine-grained access token:
GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token, with
repository access limited to `mathquizSGPrimary` and **Contents: Read and write**.
The token stays in that browser only. Untick "Remember on this device" on a shared
computer, and use "Disconnect" to remove it. Anyone can open the admin page, but
nothing can be published without your token. Unpublished edits are kept as a draft
in the browser until you publish.

Without a token you can still make changes and use "Download projects.json", then
upload that file to `public/home/` on GitHub yourself.

## Editing the file directly

The quickest way to edit by hand is on GitHub: open `public/home/projects.json`, click
the pencil icon, make the change, and commit to `claude/deploy-app-github-adtcla`.
The site redeploys by itself in about two minutes.

Or just ask Claude in the "Games Publishing Home Page" project, for example
"hide Dice Grid" or "add my new game at https://…".

## Hide or show a page

Find the entry and change `"visible"`:

```json
"visible": false
```

Hidden pages disappear for visitors. To check them yourself, open the page
with `?preview` at the end:
https://gcwm-play.github.io/mathquizSGPrimary/home/?preview

## Add a new page

Copy an existing entry, paste it inside the `"projects"` list (watch the
commas between entries), and change the fields:

| Field      | What it does |
| ---------- | ------------ |
| `id`       | Short unique name with letters, numbers and hyphens. Also the link to its details, e.g. `…/home/#flit`. |
| `title`    | Name on the card. |
| `summary`  | One or two sentences about what it is. |
| `url`      | Where "Play" goes. |
| `image`    | Screenshot path, e.g. `shots/my-game.webp`. |
| `category` | One of the `id`s in `"categories"` (sim, learn, arcade, proto, events). |
| `tags`     | Short labels shown on the card. |
| `source`   | GitHub repo link for the "Source code" button. Leave it out to hide the button. |
| `added`    | Date as `YYYY-MM-DD`. Used by the Newest / Oldest sort. |
| `color`    | Accent colour for the card's hover glow, e.g. `"#E0473B"`. |
| `featured` | `true` puts it in the big rotating spotlight at the top and first in the list. |
| `visible`  | `false` hides it. |

## Screenshots

Put the image in `public/home/shots/`. Any PNG, JPG or WebP works; a 16:10
shape around 960 × 600 fits the cards best. On GitHub, open the `shots`
folder, then Add file → Upload files.

## Categories and site text

- Add or rename a filter chip in `"categories"`. A category with no visible
  pages doesn't show.
- The name, tagline and intro at the top come from `"site"`.

## If the page shows "The game list did not load"

`projects.json` has a typo, usually a missing or extra comma or quote.
Paste the file into https://jsonlint.com to find the line.
