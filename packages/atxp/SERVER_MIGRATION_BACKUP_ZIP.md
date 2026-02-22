# Server Migration: Backup Endpoint Zip Compression

The CLI backup tool now sends and expects zip archives instead of JSON payloads. The server endpoints need to be updated accordingly.

## Summary of Changes

The CLI `backup push` command now:
- Collects `.md` files and creates a **zip archive** (DEFLATE, level 9) using `jszip`
- Sends the zip as a binary body with `Content-Type: application/zip`

The CLI `backup pull` command now:
- Sends `Accept: application/zip` header
- Expects a binary zip archive response (not JSON)
- Extracts files from the zip on the client side

The `backup status` endpoint is **unchanged**.

---

## Endpoint Changes Required

### `PUT /backup/files` (push)

**Before:**
- `Content-Type: application/json`
- Body: `{ "files": [{ "path": "SOUL.md", "content": "# Soul" }, ...] }`

**After:**
- `Content-Type: application/zip`
- Body: raw zip archive binary

**Server handling:**

1. Read the request body as a binary buffer (not JSON)
2. Extract the zip archive (e.g., using `jszip`, `yauzl`, or `adm-zip` in Node; `zipfile` in Python)
3. Each entry in the zip is a `.md` file with its relative path preserved as the zip entry name
4. Store the extracted files the same way the old JSON files were stored
5. The response format is **unchanged**: `{ "fileCount": <number>, "syncedAt": "<ISO timestamp>" }`

**Example server pseudocode (Node.js):**
```js
// Before:
// const { files } = JSON.parse(body);

// After:
const JSZip = require('jszip');
const zip = await JSZip.loadAsync(requestBodyBuffer);
const files = [];
for (const [name, entry] of Object.entries(zip.files)) {
  if (entry.dir) continue;
  const content = await entry.async('string');
  files.push({ path: name, content });
}
// Then store `files` exactly as before
```

### `GET /backup/files` (pull)

**Before:**
- Response `Content-Type: application/json`
- Body: `{ "files": [{ "path": "SOUL.md", "content": "# Soul" }, ...] }`

**After:**
- Client sends `Accept: application/zip` header
- Response `Content-Type: application/zip`
- Body: raw zip archive binary containing all backed-up files

**If no backup exists**, return an empty body (0 bytes) with a 200 status. The client handles this as "no backup found."

**Example server pseudocode (Node.js):**
```js
// Before:
// res.json({ files });

// After:
const JSZip = require('jszip');
const zip = new JSZip();
for (const file of storedFiles) {
  zip.file(file.path, file.content);
}
const zipBuffer = await zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 9 },
});
res.setHeader('Content-Type', 'application/zip');
res.send(zipBuffer);
```

### `GET /backup/status` (status)

**No changes required.** This endpoint continues to return JSON:
```json
{ "fileCount": 5, "syncedAt": "2026-02-22T...", "totalBytes": 12345 }
```

Note: `totalBytes` should reflect the **uncompressed** size of the stored files (sum of all file contents in bytes), not the zip archive size. This is what users see in `backup status` output.

---

## Migration Strategy

Since `push` replaces the entire server snapshot and there is no versioning, the migration is straightforward:

1. **Deploy the server update first** with support for `application/zip` on both endpoints
2. Optionally support both `application/json` (legacy) and `application/zip` during a transition period by checking the `Content-Type` header on `PUT /backup/files`:
   - If `application/zip` -> extract from zip
   - If `application/json` -> parse JSON (legacy fallback)
3. For `GET /backup/files`, check the `Accept` header:
   - If `Accept: application/zip` -> respond with zip
   - Otherwise -> respond with JSON (legacy fallback)
4. Once CLI version with zip support is widely deployed, remove JSON fallback

---

## Storage Consideration

Server-side, you can choose to either:

- **Store files individually** (extract on receive, re-zip on serve) -- same as current behavior but with zip/unzip at the boundary
- **Store the zip blob directly** -- simpler, saves CPU on push, just store and serve the raw zip. On status requests, you'd need to either cache metadata or extract to count files/compute sizes.

The second option is recommended for simplicity since backups are small (markdown files only).
