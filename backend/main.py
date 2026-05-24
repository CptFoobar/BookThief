import os
import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import re
import urllib3
import sqlite3
import time
from database import init_db, save_download, update_status, get_all_downloads, get_status_db, log_debug
from mailer import send_to_kindle
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Disable insecure request warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = FastAPI()

# Initialize DB on startup
@app.on_event("startup")
def startup_event():
    init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DOWNLOAD_DIR = os.path.abspath("downloads")
if not os.path.exists(DOWNLOAD_DIR):
    os.makedirs(DOWNLOAD_DIR)

class Book(BaseModel):
    id: str
    title: str
    authors: str
    publisher: str
    year: str
    language: str
    size: str
    extension: str
    mirrors: List[str]
    detail_url: str
    cover_url: Optional[str] = None

class DownloadRequest(BaseModel):
    id: str
    title: str
    authors: str
    publisher: str
    year: str
    language: str
    size: str
    extension: str
    mirrors: List[str]
    detail_url: str
    send_to_kindle: bool = False

LIBGEN_URL = "https://libgen.li/index.php"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1"
}

@app.get("/search", response_model=List[Book])
def search(query: str):
    params = {
        'lg_topic': 'libgen',
        'open': 0,
        'view': 'simple',
        'res': 100,
        'phrase': 1,
        'column': 'def',
        'covers': 'on',
        'req': query
    }
    
    response = requests.get(LIBGEN_URL, params=params, headers=HEADERS, verify=False)
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to fetch from Libgen")
    
    soup = BeautifulSoup(response.text, 'html.parser')
    table = soup.find('table', id='tablelibgen')
    if not table:
        return []
    
    rows = table.find_all('tr')[1:] # Skip header
    books = []
    
    for row in rows:
        cols = row.find_all('td')
        if len(cols) < 10: # Increased as covers shift columns
            continue
            
        # Cover extraction (New col 0)
        cover_url = None
        img = cols[0].find('img')
        if img and img.get('src'):
            src = img.get('src')
            cover_url = f"https://libgen.li{src}" if src.startswith('/') else src

        col1 = cols[1] # Title shifted to col 1
        # Title extraction logic
        b_tag = col1.find('b')
        title = b_tag.get_text(strip=True) if b_tag else ""
        
        edition_links = col1.find_all('a', href=re.compile(r'edition\.php'))
        book_id = ""
        
        if not title:
            for link in edition_links:
                text = link.get_text(strip=True)
                if not re.search(r'\d{7,}', text):
                    title = text
                    break
        
        if not title and edition_links:
            title = edition_links[0].get_text(strip=True)
            
        for link in edition_links:
            if link.get('title'):
                id_match = re.search(r'ID:\s*(\d+)', link.get('title'))
                if id_match:
                    book_id = id_match.group(1)
                    break
        
        if not title:
            title = col1.get_text(strip=True)
            
        authors = cols[2].get_text(strip=True)
        publisher = cols[3].get_text(strip=True)
        year = cols[4].get_text(strip=True)
        language = cols[5].get_text(strip=True)
        size = cols[7].get_text(strip=True)
        extension = cols[8].get_text(strip=True).lower()
        
        if extension != 'epub':
            continue
            
        mirror_links = []
        mirror_cell = cols[9]
        for a in mirror_cell.find_all('a'):
            href = a.get('href')
            if href:
                if not href.startswith('http'):
                    if href.startswith('/'):
                        href = f"https://libgen.li{href}"
                    else:
                        href = f"https://libgen.li/{href}"
                mirror_links.append(href)
        
        # Extract detail page URL (edition.php)
        edition_link = ""
        if edition_links:
            href = edition_links[0].get('href')
            if href:
                edition_link = f"https://libgen.li/{href}" if not href.startswith('http') else href

        books.append(Book(
            id=book_id or f"gen-{len(books)}",
            title=title,
            authors=authors,
            publisher=publisher,
            year=year,
            language=language,
            size=size,
            extension=extension,
            mirrors=mirror_links[:3],
            detail_url=edition_link or (mirror_links[0] if mirror_links else f"https://libgen.li/index.php?req={query}"),
            cover_url=cover_url
        ))
        
    return books

# Progress tracking
download_status = {}

def perform_download(book_data: dict, auto_email: bool = False):
    download_id = book_data['id']
    title = book_data['title']
    extension = book_data['extension']
    mirrors = book_data['mirrors']
    
    try:
        log_debug(f"Starting background download for {download_id}: {title}")
        
        # Clean title but keep spaces
        safe_title = re.sub(r'[^\w\s-]', '', title).strip()
        filename = f"{safe_title}.{extension}"
        filepath = os.path.join(DOWNLOAD_DIR, filename)
        
        download_status[download_id] = {"status": "downloading", "path": None}
        update_status(download_id, "downloading")
        
        for mirror in mirrors:
            for attempt in range(2):
                try:
                    log_debug(f"Attempting {mirror} (attempt {attempt+1})")
                    target_url = mirror
                    
                    if "ads.php" in mirror or "libgen.li/ads.php" in mirror:
                        res = requests.get(mirror, headers=HEADERS, verify=False, timeout=15)
                        if res.status_code == 200:
                            s = BeautifulSoup(res.text, 'html.parser')
                            get_link = s.find('a', string=re.compile(r'GET', re.I))
                            if get_link and get_link.get('href'):
                                target_url = get_link.get('href')
                                if not target_url.startswith('http'):
                                    if target_url.startswith('/'):
                                        target_url = f"https://libgen.li{target_url}"
                                    else:
                                        target_url = f"https://libgen.li/{target_url}"
                    
                    log_debug(f"Downloading from {target_url}")
                    file_res = requests.get(target_url, headers=HEADERS, verify=False, stream=True, timeout=30)
                    if file_res.status_code == 200:
                        with open(filepath, 'wb') as f:
                            for chunk in file_res.iter_content(chunk_size=8192):
                                f.write(chunk)
                        
                        log_debug(f"Download completed for {download_id}")
                        download_status[download_id] = {"status": "downloaded", "path": filepath}
                        update_status(download_id, "downloaded", filepath)
                        
                        if auto_email:
                            trigger_email(download_id, filepath)
                        return
                    else:
                        log_debug(f"Failed with status {file_res.status_code}")
                except Exception as e:
                    log_debug(f"Error during attempt: {str(e)}")
                    continue
                    
        log_debug(f"All mirrors failed for {download_id}")
        download_status[download_id] = {"status": "download-failed", "path": None}
        update_status(download_id, "download-failed")
    except Exception as e:
        log_debug(f"CRITICAL ERROR in perform_download: {str(e)}")
        download_status[download_id] = {"status": "download-failed", "path": None}

def trigger_email(book_id, file_path):
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    kindle_email = os.getenv("KINDLE_EMAIL")

    if not all([smtp_server, smtp_port, smtp_user, smtp_password, kindle_email]):
        log_debug("Skipping email: SMTP credentials not set in .env")
        return

    download_status[book_id] = {"status": "kindle-sending", "path": file_path}
    update_status(book_id, "kindle-sending")

    success, msg = send_to_kindle(file_path, smtp_server, smtp_port, smtp_user, smtp_password, kindle_email)
    if success:
        log_debug(f"Email sent for {book_id}")
        download_status[book_id] = {"status": "kindle-sent", "path": file_path}
        update_status(book_id, "kindle-sent")
    else:
        log_debug(f"Email failed for {book_id}: {msg}")
        download_status[book_id] = {"status": "kindle-failed", "path": file_path}
        update_status(book_id, "kindle-failed")

@app.post("/download")
def start_download(req: DownloadRequest, background_tasks: BackgroundTasks):
    book_dict = req.model_dump()
    log_debug(f"Received download request for {book_dict['id']} (send_to_kindle: {req.send_to_kindle})")
    try:
        save_download(book_dict, "downloading")
    except Exception as e:
        log_debug(f"Error saving to DB: {str(e)}")
        
    background_tasks.add_task(perform_download, book_dict, auto_email=req.send_to_kindle)
    return {"message": "Download started", "id": req.id}

@app.post("/email/{book_id}")
def email_existing_book(book_id: str, background_tasks: BackgroundTasks):
    res = get_status_db(book_id)
    if not res or res["status"] != "downloaded" or not res["file_path"]:
        raise HTTPException(status_code=400, detail="Book not downloaded or not found")
    
    background_tasks.add_task(trigger_email, book_id, res["file_path"])
    return {"message": "Emailing started"}

@app.get("/status/{download_id}")
def get_status(download_id: str):
    # Check in-memory first for real-time
    status = download_status.get(download_id)
    if status:
        return status
    
    # Check database
    try:
        res = get_status_db(download_id)
        if res:
            return {"status": res["status"], "path": res["file_path"]}
    except Exception as e:
        log_debug(f"Error getting status from DB: {str(e)}")
        
    raise HTTPException(status_code=404, detail="Download not found")

@app.get("/downloads")
def list_downloads():
    return get_all_downloads()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
