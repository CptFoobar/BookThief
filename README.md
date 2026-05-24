# BookThief

A lightweight webapp to search and download EPUB books from `libgen.li`.

## Setup

1. **Backend**:
   ```bash
   cd backend
   python main.py
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

Or use the provided `run.sh`:
```bash
./run.sh
```

## Features
- Search by book, author, or ISBN.
- Filters results to only show EPUB format.
- Clean, minimal beige/black UI.
- Automatic retry across up to 3 mirrors.
- Notifications for download progress and completion.
