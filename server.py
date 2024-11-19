from flask import Flask, request, jsonify, render_template, send_from_directory
import json
import os
import csv
import atexit

app = Flask(__name__)

# Define paths
csv_file_path = "admins.csv"
TEMPLATES_DIR = os.path.join(os.getcwd(), "templates")
STATIC_DIR = os.path.join(os.getcwd(), "static")

# Ensure the CSV file exists
if not os.path.exists(csv_file_path):
    with open(csv_file_path, "w", newline="", encoding="utf-8") as csv_file:
        writer = csv.writer(csv_file)
        # Write header row to CSV file
        writer.writerow(["username", "email", "password", "role", "created"])

# Cleanup function to clear the CSV file cache
def clear_csv_cache():
    print("Clearing admins.csv cache...")
    with open(csv_file_path, "w", newline="", encoding="utf-8") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(["username", "email", "password", "role", "created"])  # Write empty header row

# Register the cleanup function to run at exit
atexit.register(clear_csv_cache)

@app.route("/")
def index():
    return render_template("adminControlPanel.html")

@app.route("/<page_name>")
def serve_page(page_name):
    try:
        return render_template(page_name)
    except Exception as e:
        return f"Error loading page: {e}", 404

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
            "password": password,
            "role": role,
            "created": request.json.get("created", "")  # Optional timestamp
        }

        # Append the new admin to the CSV file
        with open(csv_file_path, "a", newline="", encoding="utf-8") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=new_admin.keys())
            writer.writerow(new_admin)

        return jsonify({"success": True, "message": "Admin saved successfully"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/load_admins", methods=["GET"])
def load_admins():
    try:
        admins = []
        # Read and return the list of admins from the CSV file
        with open(csv_file_path, "r", newline="", encoding="utf-8") as csv_file:
            reader = csv.DictReader(csv_file)
            for row in reader:
                admins.append(row)

        return jsonify(admins)
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/static/<path:path>")
def static_files(path):
    # Serve static files (CSS, JS, etc.)
    return send_from_directory(STATIC_DIR, path)

if __name__ == "__main__":
    app.run(debug=True, port=8080)
