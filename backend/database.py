import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(__file__), "downloads.db")

def init_db():
    log_debug("Initializing database")
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS downloads (
                id TEXT PRIMARY KEY,
                title TEXT,
                authors TEXT,
                publisher TEXT,
                year TEXT,
                language TEXT,
                size TEXT,
                extension TEXT,
                mirrors TEXT,
                detail_url TEXT,
                status TEXT,
                file_path TEXT,
                finished INTEGER DEFAULT 0,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Check if finished column exists
        cursor.execute("PRAGMA table_info(downloads)")
        columns = [column[1] for column in cursor.fetchall()]
        if 'finished' not in columns:
            log_debug("Adding 'finished' column to downloads table")
            cursor.execute("ALTER TABLE downloads ADD COLUMN finished INTEGER DEFAULT 0")
        
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_downloads_timestamp ON downloads(timestamp)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status)")
        conn.commit()

def save_download(book_data, status="pending", file_path=None):
    log_debug(f"Saving book {book_data['id']} to DB with status {status}")
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        
        # Check if exists
        cursor.execute("SELECT id FROM downloads WHERE id = ?", (book_data['id'],))
        exists = cursor.fetchone()
        
        mirrors_str = json.dumps(book_data.get('mirrors', []))
        
        if exists:
            log_debug(f"Book {book_data['id']} exists, updating")
            cursor.execute("""
                UPDATE downloads SET 
                    status = ?, 
                    file_path = ?,
                    timestamp = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (status, file_path, book_data['id']))
        else:
            log_debug(f"Book {book_data['id']} is new, inserting")
            cursor.execute("""
                INSERT INTO downloads (
                    id, title, authors, publisher, year, language, 
                    size, extension, mirrors, detail_url, status, file_path
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                book_data['id'],
                book_data['title'],
                book_data['authors'],
                book_data['publisher'],
                book_data['year'],
                book_data['language'],
                book_data['size'],
                book_data['extension'],
                mirrors_str,
                book_data['detail_url'],
                status,
                file_path
            ))
        
        conn.commit()

def update_status(book_id, status, file_path=None):
    log_debug(f"Updating status for {book_id} to {status}")
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        if file_path:
            cursor.execute("UPDATE downloads SET status = ?, file_path = ? WHERE id = ?", (status, file_path, book_id))
        else:
            cursor.execute("UPDATE downloads SET status = ? WHERE id = ?", (status, book_id))
        conn.commit()

def toggle_finished(book_id, finished):
    # Sanitize book_id for logging
    safe_id = str(book_id).replace('\n', '').replace('\r', '')
    log_debug(f"Toggling finished for {safe_id} to {finished}")
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE downloads SET finished = ? WHERE id = ?", (1 if finished else 0, book_id))
        conn.commit()

def get_status_db(book_id):
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT status, file_path, finished FROM downloads WHERE id = ?", (book_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

def get_all_downloads(limit: int = 1000, offset: int = 0, search: str = None):
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        where_clause = ""
        params = []
        if search:
            where_clause = " WHERE title LIKE ? OR authors LIKE ?"
            search_param = f"%{search}%"
            params = [search_param, search_param]
        
        # Get total count
        cursor.execute(f"SELECT COUNT(*) FROM downloads{where_clause}", params)
        total_count = cursor.fetchone()[0]
        
        # Get status stats
        cursor.execute("SELECT status, COUNT(*) FROM downloads GROUP BY status")
        stats_rows = cursor.fetchall()
        stats = {row[0]: row[1] for row in stats_rows}
        
        # Get finished count
        cursor.execute("SELECT COUNT(*) FROM downloads WHERE finished = 1")
        read_count = cursor.fetchone()[0]
        
        # Get paginated results
        query_params = params + [limit, offset]
        cursor.execute(f"SELECT * FROM downloads{where_clause} ORDER BY timestamp DESC LIMIT ? OFFSET ?", query_params)
        rows = cursor.fetchall()
        
        return {
            "items": [dict(row) for row in rows],
            "total": total_count,
            "stats": {
                "sent_to_kindle": stats.get("kindle-sent", 0),
                "downloading": stats.get("downloading", 0) + stats.get("kindle-sending", 0),
                "read": read_count
            }
        }

def log_debug(message):
    with open(os.path.join(os.path.dirname(__file__), "debug.log"), "a") as f:
        f.write(f"{message}\n")
