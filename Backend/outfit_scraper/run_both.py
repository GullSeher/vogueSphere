import subprocess
import time

if __name__ == "__main__":
    print("Starting both Flask apps...")

    # Start fetch_and_match.py on port 5000
    fetch_proc = subprocess.Popen(["python", "outfit_scraper/fetch_and_match.py"])
    print("fetch_and_match.py started on http://127.0.0.1:5001")

    # Give it a second to start
    time.sleep(2)

    # Start app.py (AI Feedback) on port 5001
    ai_proc = subprocess.Popen(["python", "outfit_scraper/app.py"])
    print("app.py (AI Feedback) started on http://127.0.0.1:5000")

    print("Both apps are running. Press Ctrl+C to stop.")

    try:
        # Keep the script running to maintain subprocesses
        fetch_proc.wait()
        ai_proc.wait()
    except KeyboardInterrupt:
        print("Stopping both apps...")
        fetch_proc.terminate()
        ai_proc.terminate()
        print("Both apps stopped.")
