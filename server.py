from flask import Flask, request, jsonify, render_template, send_from_directory
import json
import os
import csv
import atexit
import sys
from config.server import config

# Get environment from environment variable or default to development
env = os.getenv('FLASK_ENV', 'development')
app_config = config[env]

app = Flask(__name__, 
           static_folder='static',
           template_folder='src/views/pages')

# Apply configuration
app.config.from_object(app_config)

# Define paths from configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "src", "models", "data")
csv_file_path = os.path.join(DATA_DIR, "users.csv")

# Ensure the CSV file exists
if not os.path.exists(csv_file_path):
    os.makedirs(os.path.dirname(csv_file_path), exist_ok=True)
    with open(csv_file_path, "w", newline="", encoding="utf-8") as csv_file:
        writer = csv.writer(csv_file)
        # Write header row to CSV file
        writer.writerow(["username", "email", "password", "role", "created"])

def clear_csv_cache():
    """Cleanup function to clear the CSV file cache"""
    print("Clearing users.csv cache...")
    with open(csv_file_path, "w", newline="", encoding="utf-8") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(["username", "email", "password", "role", "created"])

# Register the cleanup function to run at exit
atexit.register(clear_csv_cache)

@app.route("/")
def index():
    return send_from_directory('.', 'index.html')

@app.route("/src/<path:path>")
def serve_src(path):
    return send_from_directory('src', path)

@app.route("/static/<path:path>")
def serve_static(path):
    return send_from_directory('static', path)

@app.route("/save_admin", methods=["POST"])
def save_admin():
    try:
        # Get admin details from the request
        data = request.json
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")
        role = data.get("role")

        # Validate that all required fields are present
        if not username or not email or not password or not role:
            return jsonify({"success": False, "message": "All fields are required"}), 400

        # Check for duplicate email in CSV
        with open(csv_file_path, "r", newline="", encoding="utf-8") as csv_file:
            reader = csv.DictReader(csv_file)
            for row in reader:
                if row["email"] == email:
                    return jsonify({"success": False, "message": "Admin with this email already exists"}), 409

        # Create a new admin entry
        new_admin = {
            "username": username,
            "email": email,
            "password": password,  # In production, this should be hashed
            "role": role,
            "created": request.json.get("created", "")
        }

        # Append the new admin to the CSV file
        with open(csv_file_path, "a", newline="", encoding="utf-8") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=new_admin.keys())
            writer.writerow(new_admin)

        return jsonify({"success": True, "message": "Admin saved successfully"})
    except Exception as e:
        app.logger.error(f"Error saving admin: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/load_admins", methods=["GET"])
def load_admins():
    try:
        admins = []
        with open(csv_file_path, "r", newline="", encoding="utf-8") as csv_file:
            reader = csv.DictReader(csv_file)
            for row in reader:
                admins.append(row)

        return jsonify(admins)
    except Exception as e:
        app.logger.error(f"Error loading admins: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == "__main__":
    port = int(os.getenv('PORT', app_config.PORT if hasattr(app_config, 'PORT') else 8080))
    debug = app_config.DEBUG if hasattr(app_config, 'DEBUG') else True
    app.run(debug=debug, port=port)
