# Prompt Library

A small, client-side prompt library web app that lets you save, view, copy, and delete prompts using your browser's `localStorage`.

Files:

- `index.html` — main UI
- `styles.css` — styles
- `app.js` — JS logic (save/load/delete from `localStorage`)

How to use:

1. Open `index.html` in your browser (double-click the file or serve with a simple static server).
2. Enter a title and the prompt content, then click `Save Prompt`.
3. Saved prompts appear on the right. Use `Copy` to copy content to clipboard or `Delete` to remove it.

# Ratings

This includes a 5-star rating control for saved prompts.

Features:

- Click a star to set/update rating (1–5). Clicking the same rating clears it.
- Hover stars to preview before clicking.
- Keyboard support: focus a star and use Left/Right (or Up/Down) to move, Enter/Space to set.
- Sort by `Top-rated` with the selector in the Saved Prompts header.

Ratings are saved to `localStorage` with each prompt as the `rating` field.