import os
import httpx
import argparse
from pathlib import Path

def train_model(folder_path, session_name):
    url = "http://127.0.0.1:8000/api/v1/calibrate"
    folder = Path(folder_path)
    
    if not folder.exists() or not folder.is_dir():
        print(f"Error: {folder} is not a valid directory.")
        return
        
    print(f"Scanning {folder} for PNG/JPG images...")
    valid_exts = {".png", ".jpg", ".jpeg"}
    image_paths = [p for p in folder.iterdir() if p.suffix.lower() in valid_exts]
    
    if len(image_paths) < 5:
        print("Error: Need at least 5 images to calibrate!")
        return
        
    print(f"Found {len(image_paths)} images. Uploading to ParakhAI Backend...")
    
    # Prepare multipart form data
    files = [("files", (p.name, open(p, "rb"), "image/png")) for p in image_paths]
    data = {"session_name": session_name}
    
    with httpx.Client() as client:
        try:
            response = client.post(url, data=data, files=files, timeout=60.0)
            if response.status_code == 200:
                print("SUCCESS!")
                print(response.json())
            else:
                print("FAILED!")
                print(response.text)
        except Exception as e:
            print(f"Connection error: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Upload folder to train ParakhAI via API")
    parser.add_argument("folder", help="Path to folder containing ONLY good images")
    parser.add_argument("session_name", help="Name of the model (e.g. 'bottle')")
    args = parser.parse_args()
    train_model(args.folder, args.session_name)
