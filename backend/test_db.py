from database import init_db, save_download, get_all_downloads
import os

def test_db():
    print("Initializing DB...")
    init_db()
    
    book_data = {
        'id': 'test-id-123',
        'title': 'Test Book',
        'authors': 'Test Author',
        'publisher': 'Test Publisher',
        'year': '2024',
        'language': 'English',
        'size': '1 MB',
        'extension': 'epub',
        'mirrors': ['http://mirror1.com'],
        'detail_url': 'http://detail.com'
    }
    
    print("Saving download...")
    save_download(book_data, "downloading")
    
    print("Checking downloads...")
    downloads = get_all_downloads()
    print(f"Total downloads: {len(downloads)}")
    for d in downloads:
        print(d)

if __name__ == "__main__":
    test_db()
