import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(__file__), "downloads.db")

def init_db():
    log_debug("Initializing database")
    conn = sqlite3.connect(DB_PATH)
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
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_downloads_timestamp ON downloads(timestamp)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status)")
    conn.commit()
    conn.close()

def save_download(book_data, status="pending", file_path=None):
    log_debug(f"Saving book {book_data['id']} to DB with status {status}")
    conn = sqlite3.connect(DB_PATH)
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
    conn.close()

def update_status(book_id, status, file_path=None):
    log_debug(f"Updating status for {book_id} to {status}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    if file_path:
        cursor.execute("UPDATE downloads SET status = ?, file_path = ? WHERE id = ?", (status, file_path, book_id))
    else:
        cursor.execute("UPDATE downloads SET status = ? WHERE id = ?", (status, book_id))
    conn.commit()
    conn.close()

def get_status_db(book_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT status, file_path FROM downloads WHERE id = ?", (book_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_all_downloads(limit: int = 1000, offset: int = 0):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get total count
    cursor.execute("SELECT COUNT(*) FROM downloads")
    total_count = cursor.fetchone()[0]
    
    # Get status stats
    cursor.execute("SELECT status, COUNT(*) FROM downloads GROUP BY status")
    stats_rows = cursor.fetchall()
    stats = {row[0]: row[1] for row in stats_rows}
    
    # Get paginated results
    cursor.execute("SELECT * FROM downloads ORDER BY timestamp DESC LIMIT ? OFFSET ?", (limit, offset))
    rows = cursor.fetchall()
    conn.close()
    
    return {
        "items": [dict(row) for row in rows],
        "total": total_count,
        "stats": {
            "sent_to_kindle": stats.get("kindle-sent", 0),
            "downloading": stats.get("downloading", 0) + stats.get("kindle-sending", 0)
        }
    }

def log_debug(message):
    with open(os.path.join(os.path.dirname(__file__), "debug.log"), "a") as f:
        f.write(f"{message}\n")
