import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(__file__), "downloads.db")

def init_db():
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
    conn.commit()
    conn.close()

def save_download(book_data, status="pending", file_path=None):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if exists
    cursor.execute("SELECT id FROM downloads WHERE id = ?", (book_data['id'],))
    exists = cursor.fetchone()
    
    mirrors_str = json.dumps(book_data.get('mirrors', []))
    
    if exists:
        cursor.execute("""
            UPDATE downloads SET 
                status = ?, 
                file_path = ?,
                timestamp = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (status, file_path, book_data['id']))
    else:
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

def get_all_downloads():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM downloads ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def log_debug(message):
    with open(os.path.join(os.path.dirname(__file__), "debug.log"), "a") as f:
        f.write(f"{message}\n")
