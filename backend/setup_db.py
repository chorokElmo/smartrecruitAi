"""One-time script: create the smartrecruit DB user and database."""
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import sys

# Edit POSTGRES_PASSWORD below if none of the defaults work
POSTGRES_PASSWORD = None  # Will try common defaults, or set explicitly here

common_passwords = ["", "postgres", "admin", "password", "1234", "root"]

if POSTGRES_PASSWORD is not None:
    common_passwords = [POSTGRES_PASSWORD]

conn = None
for pwd in common_passwords:
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            user="postgres",
            password=pwd,
            dbname="postgres",
            client_encoding="utf-8",
        )
        print(f"Connected with password: '{pwd}'")
        break
    except (psycopg2.OperationalError, UnicodeDecodeError):
        continue  # wrong password or French locale decode error — try next

if conn is None:
    print("\nCould not connect — none of the default passwords worked.")
    print("Please open setup_db.py and set POSTGRES_PASSWORD to your postgres superuser password,")
    print("then re-run:  .venv\\Scripts\\python.exe setup_db.py")
    sys.exit(1)

conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
cur = conn.cursor()

cur.execute("SELECT 1 FROM pg_roles WHERE rolname='smartrecruit'")
if not cur.fetchone():
    cur.execute("CREATE USER smartrecruit WITH PASSWORD 'smartrecruit_pass'")
    print("User 'smartrecruit' created.")
else:
    print("User 'smartrecruit' already exists.")

cur.execute("SELECT 1 FROM pg_database WHERE datname='smartrecruit_db'")
if not cur.fetchone():
    cur.execute("CREATE DATABASE smartrecruit_db OWNER smartrecruit")
    print("Database 'smartrecruit_db' created.")
else:
    print("Database 'smartrecruit_db' already exists.")

cur.execute("GRANT ALL PRIVILEGES ON DATABASE smartrecruit_db TO smartrecruit")
print("DB privileges granted.")

# PostgreSQL 15+: public schema is restricted by default — grant schema access
cur.execute("GRANT ALL ON SCHEMA public TO smartrecruit")
cur.execute("ALTER DATABASE smartrecruit_db OWNER TO smartrecruit")
print("Schema privileges granted. All done!")
conn.close()
