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

Run locally (recommended):

If you have Python installed you can run a tiny static server from the project folder:

```bash
# Python 3
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

Notes:
- Prompts are stored only in the browser where you save them (using `localStorage`).
- Clearing browser data will remove all saved prompts.

If you'd like, I can:
- Add import/export (JSON) for backups
- Add editing of saved prompts
- Add tags or search/filter features
