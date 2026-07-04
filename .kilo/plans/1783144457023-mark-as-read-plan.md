# Plan: Add "Mark as Read" support to History Page

This plan outlines the changes required to add a "Mark as read" feature to the BookThief webapp. This involves database schema updates, a new backend API endpoint, and frontend UI enhancements.

## 1. Database Changes (`backend/database.py`)

- **Schema Update:** Modify `init_db()` to add a `finished` column (INTEGER, default 0) to the `downloads` table if it doesn't already exist.
  ```sql
  ALTER TABLE downloads ADD COLUMN finished INTEGER DEFAULT 0;
  ```
- **New Function:** Implement `toggle_finished(book_id: str, finished: bool)` to update the `finished` status for a specific book.
- **Update Existing Functions:**
  - `get_all_downloads()`: No changes needed to the SQL if `SELECT *` is used, but ensure the `finished` field is included in the returned dictionary.
  - `save_download()`: Ensure it doesn't accidentally reset the `finished` status if a book is re-downloaded (though `INSERT OR IGNORE` or checking before insert might be better, currently it uses `UPDATE` or `INSERT`).

## 2. Backend API Changes (`backend/main.py`)

- **New Endpoint:** `POST /finished/{book_id}`
  - **Request Body:** `{ "finished": bool }`
  - **Functionality:** Calls `database.toggle_finished()` and returns success/error.
- **Update Response Models:** If Pydantic models are used for responses (none seen for `/downloads` yet), they should include the `finished` field.

## 3. Frontend UI Changes (`frontend/src/pages/HistoryPage.jsx`)

- **State Management:** Add logic to handle the `finished` toggle in the frontend state so the UI updates immediately after clicking.
- **Desktop Table:**
  - Add a new column "Finished" or "Read".
  - Use a checkbox or a button with an icon (e.g., `IconCheck` or `IconBook`) to toggle the state.
- **Mobile Cards:**
  - Add a button or a toggle switch inside the `HistoryCard` component.
- **Styling:**
  - Provide visual feedback when a book is marked as read (e.g., dimming the text or adding a "Read" badge).

## 4. Verification Plan

- **Database:** Verify the `finished` column is added after running the backend.
- **API:** Test the `/finished` endpoint using `curl` or a tool like Postman.
- **Frontend:**
  - Verify the button appears on both desktop and mobile views.
  - Verify clicking the button updates the database and the UI persists the state after refresh.
