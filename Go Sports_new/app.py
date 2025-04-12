import sys
from flask import Flask, render_template, request, redirect, url_for, flash
import mysql.connector
from mysql.connector import Error
from config.db_config import MYSQL_CONFIG
def create_db_connection():
    try:
        connection = mysql.connector.connect(
            host=MYSQL_CONFIG['host'],
            user=MYSQL_CONFIG['user'],
            password=MYSQL_CONFIG['password'],
            database=MYSQL_CONFIG['database'],
            port=MYSQL_CONFIG['port']
        )
        if connection.is_connected():
            db_info = connection.get_server_info()
            print(f"Connected to MySQL Server version {db_info}")
            return connection
    except Error as e:
        print(f"Error connecting to MySQL as user '{MYSQL_CONFIG['user']}': {e}", file=sys.stderr)
        flash('Database connection error. Please contact administrator.', 'error')
    return None

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'

def create_db_connection():
    try:
        connection = mysql.connector.connect(**MYSQL_CONFIG)
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

def init_db():
    try:
        # First connect without specifying database to create it
        temp_config = MYSQL_CONFIG.copy()
        temp_config.pop('database', None)
        connection = mysql.connector.connect(**temp_config)
        cursor = connection.cursor()
        
        # Create database if not exists
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {MYSQL_CONFIG['database']}")
        connection.commit()
        
        # Now connect to the specific database
        connection = create_db_connection()
        cursor = connection.cursor()
        
        # Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
            )
        """)
        
        # Add default admin user if not exists
        cursor.execute("""
            INSERT IGNORE INTO users (username, password)
            VALUES (%s, %s)
        """, ('admin', '1234'))
        
        connection.commit()
        cursor.close()
        connection.close()
        
    except Error as e:
        print(f"Error initializing database: {e}")

init_db()

@app.route('/')
def home():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        try:
            connection = create_db_connection()
            cursor = connection.cursor(dictionary=True)
            cursor.execute("""
                SELECT * FROM users 
                WHERE username = %s AND password = %s
            """, (username, password))
            user = cursor.fetchone()
            cursor.close()
            connection.close()
            
            if user:
                return redirect(url_for('dashboard'))
            else:
                flash('Invalid username or password', 'error')
                
        except Error as e:
            flash('Database error occurred', 'error')
            print(f"Database error: {e}")
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        try:
            connection = create_db_connection()
            cursor = connection.cursor()
            cursor.execute("""
                INSERT INTO users (username, password)
                VALUES (%s, %s)
            """, (username, password))
            connection.commit()
            cursor.close()
            connection.close()
            
            flash('Registration successful! Please login.', 'success')
            return redirect(url_for('login'))
            
        except Error as e:
            if e.errno == 1062:  # Duplicate entry error
                flash('Username already exists', 'error')
            else:
                flash('Registration failed', 'error')
            print(f"Database error: {e}")
    
    return render_template('register.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

if __name__ == '__main__':
    app.run(debug=True)