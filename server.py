from flask import Flask, render_template, request, send_file
from werkzeug.utils import secure_filename
import os
import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.applications.xception import preprocess_input
import json
import gdown   # ADD THIS

UPLOAD_FOLDER = "Uploaded_Files"

app = Flask("__main__", template_folder="templates")
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

MODEL_PATH = "model/xception_5o.h5"

# ADD THIS SECTION
MODEL_URL = "https://drive.google.com/file/d/1rK73CF-BWdvKNPzrj9HpGaXKEIVFpThB/view?usp=sharing"

os.makedirs("model", exist_ok=True)

if not os.path.exists(MODEL_PATH):
    print("Downloading model...")
    gdown.download(MODEL_URL, MODEL_PATH, quiet=False)

IMG_SIZE = 224
MAX_FRAMES = 35
MIN_FACE = 50

print("Loading model...")
model = load_model(MODEL_PATH, compile=False)
print("Model loaded")

face_detector = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)

def extract_frames(video_path):

    cap = cv2.VideoCapture(video_path)

    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if total == 0:
        return []

    indices = np.linspace(0, total - 1, MAX_FRAMES).astype(int)

    frames = []

    for i in indices:

        cap.set(cv2.CAP_PROP_POS_FRAMES, i)

        ret, frame = cap.read()

        if ret:
            frames.append(frame)

    cap.release()

    return frames


def get_face(frame):

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    faces = face_detector.detectMultiScale(
        gray,
        scaleFactor=1.25,
        minNeighbors=4,
        minSize=(MIN_FACE, MIN_FACE)
    )

    if len(faces) == 0:
        return None

    faces = sorted(faces, key=lambda x: x[2]*x[3], reverse=True)

    x,y,w,h = faces[0]

    face = frame[y:y+h, x:x+w]

    if face.size == 0:
        return None

    face = cv2.resize(face, (IMG_SIZE, IMG_SIZE))

    return face


def predict_video(video_path):

    frames = extract_frames(video_path)

    scores = []

    for frame in frames:

        face = get_face(frame)

        if face is None:
            continue

        img = preprocess_input(face)

        img = np.expand_dims(img, axis=0)

        pred = model(img, training=False).numpy()[0][0]

        scores.append(pred)

    if len(scores) < 5:
        return "REAL", 0

    scores = np.array(scores)

    median_score = np.median(scores)

    top_fake = np.mean(np.sort(scores)[-3:])

    final_score = 0.7 * median_score + 0.3 * top_fake

    label = "FAKE" if final_score > 0.48 else "REAL"

    return label, float(final_score)


@app.route("/", methods=["GET"])
def homepage():
    return render_template("index.html")


@app.route("/Detect", methods=["GET", "POST"])
def DetectPage():

    if request.method == "GET":
        return render_template("index.html")

    video = request.files.get("video")

    if video is None or video.filename == "":
        data = json.dumps({"error": "No file uploaded"})
        return render_template("index.html", data=data)
    filename = secure_filename(video.filename)

    allowed_ext = (".mp4",".avi",".mov",".mkv")

    if not filename.lower().endswith(allowed_ext):
        data = json.dumps({"error": "Unsupported file format"})
        return render_template("index.html", data=data)

    save_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)

    video.save(save_path)

    try:

        label, _ = predict_video(save_path)

        payload = {
            "output": label
        }

    except Exception as e:

        print("Detection error:", e)

        payload = {
            "error": "Video processing failed"
        }

    finally:

        try:
            os.remove(save_path)
        except:
            pass

    data = json.dumps(payload)

    return render_template("index.html", data=data)


@app.route('/static/react/media/bgimage.14b90305.jpg')
def legacy_bgimage():
    return send_file(os.path.join('static','react','media','bgimage.jpeg'))


@app.route('/static/react/logo192.png')
def legacy_logo():
    return send_file(os.path.join('static','react','media','bgimage.jpeg'))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)