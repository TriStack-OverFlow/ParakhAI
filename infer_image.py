import httpx
import argparse
import base64
from pathlib import Path
import json

def test_inference(image_path, session_id):
    url = "http://127.0.0.1:8000/api/v1/infer"
    img = Path(image_path)
    
    if not img.exists() or not img.is_file():
        print(f"Error: {img} is not a valid file.")
        return
        
    print(f"Sending {img.name} to ParakhAI to check against {session_id}...")
    
    files = {"file": (img.name, open(img, "rb"), "image/png")}
    data = {"session_id": session_id, "generate_heatmap": "true"}
    
    with httpx.Client(timeout=30.0) as client:
        try:
            response = client.post(url, data=data, files=files)
            if response.status_code == 200:
                result = response.json()
                print("\n=== INFERENCE RESULT ===")
                print(f"Severity:      {result.get('severity')}")
                print(f"Anomaly Score: {result.get('anomaly_score'):.4f}")
                
                # Check if it was flagged with boxes
                boxes = result.get('bboxes', [])
                if boxes:
                    print(f"Defects Found: {len(boxes)}")
                else:
                    print("Defects Found: 0")
                
                # If heatmap returned, save it
                heatmap_b64 = result.get('heatmap_b64')
                if heatmap_b64:
                    out_path = img.parent / f"result_heatmap_{img.name}"
                    with open(out_path, "wb") as f:
                        f.write(base64.b64decode(heatmap_b64))
                    print(f"\nSaved Heatmap visualization to: {out_path}")
            else:
                print("FAILED!")
                print(response.text)
        except Exception as e:
            print(f"Connection error: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("image", help="Path to a contaminated test image")
    parser.add_argument("session_id", help="Name of the model (e.g. 'bottle_model')")
    args = parser.parse_args()
    test_inference(args.image, args.session_id)
