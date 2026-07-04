# Plan - History Page Search Feature

Add a search feature to the history page of the BookThief webapp, allowing users to filter their download history by book title or author name (case-insensitive).

## User Review Required

> [!IMPORTANT]
> The search will be performed server-side to ensure performance as the history grows. This means there might be a slight delay (debounced) as the user types.

## Proposed Changes

### Backend

#### `backend/database.py`
- Update `get_all_downloads` function:
    - Accept an optional `search` string parameter.
    - If `search` is provided, append a `WHERE` clause to the SQL queries for both total count and paginated items: `WHERE title LIKE ? OR authors LIKE ?`.
    - Use `%search%` as the parameter for `LIKE` to match anywhere in the string.
    - SQLite `LIKE` is case-insensitive for ASCII by default, which satisfies the requirement.

#### `backend/main.py`
- Update the `/downloads` endpoint:
    - Add an optional `search` query parameter.
    - Pass this `search` parameter to the `get_all_downloads` call.

### Frontend

#### `frontend/src/pages/HistoryPage.jsx`
- **Imports**:
    - Add `TextInput` to the `@mantine/core` imports.
    - Add `IconSearch` to the `@tabler/icons-react` imports.
- **State**:
    - Add `search` state for the input field.
    - Add `debouncedSearch` state to manage API calls.
- **Side Effects**:
    - Add a `useEffect` to handle debouncing of the `search` state (500ms delay).
    - Update the existing `fetchHistory` `useEffect`:
        - Add `debouncedSearch` to the dependency array.
        - Pass the `search` parameter in the `axios.get` call.
        - Reset `activePage` to 1 whenever `debouncedSearch` changes.
- **UI**:
    - Add a `TextInput` component above the history list/table.
    - Style it to match the existing theme (centered, maximum width).
    - Include the `IconSearch` as the `leftSection`.

## Verification Plan

### Automated Tests
- No existing automated tests were found for these specific components, but manual verification will be performed.
- (Optional) If requested, I can add a simple backend test for the filtered database query.

### Manual Verification
1.  **Search by Title**: Type a known book title in the search box and verify the list updates to show only that book.
2.  **Search by Author**: Type a known author name and verify the list filters correctly.
3.  **Case Insensitivity**: Search for "TITle", "title", and "TITLE" to ensure they all return the same results.
4.  **Partial Match**: Search for a substring (e.g., "Potter" for "Harry Potter") and verify it works.
5.  **Empty Search**: Clear the search box and verify the full history is displayed again.
6.  **No Results**: Search for a non-existent title and verify the "No history yet" message (or update it to "No results found for ...").
7.  **Pagination with Search**: Search for a term that has multiple pages of results and verify pagination works within the filtered set.
8.  **Mobile View**: Verify the search input looks and works correctly on mobile devices.
