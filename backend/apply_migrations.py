import os
import sys
import psycopg2

def main():
    # Retrieve password from args, env, or prompt
    password = None
    if len(sys.argv) > 1:
        password = sys.argv[1]
    else:
        password = os.environ.get("DB_PASSWORD")
        
    if not password:
        password = input("Enter Supabase Database Password: ").strip()

    print("Connecting to Supabase PostgreSQL database...")
    try:
        conn = psycopg2.connect(
            host="db.gopwdyikkspgvoedeaxh.supabase.co",
            port=5432,
            database="postgres",
            user="postgres",
            password=password
        )
        conn.autocommit = True
        cursor = conn.cursor()
        print("Connected successfully.")
    except Exception as e:
        print(f"Error connecting to database: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        # Drop old tables
        print("Dropping existing tables to clean schema...")
        cursor.execute("DROP TABLE IF EXISTS public.messages, public.video_metadata, public.sessions, public.searches CASCADE;")
        
        # Apply migrations in order
        base_dir = os.path.dirname(os.path.abspath(__file__))
        migrations = [
            os.path.join(base_dir, "migrations", "001_create_sessions.sql"),
            os.path.join(base_dir, "migrations", "002_create_messages.sql"),
            os.path.join(base_dir, "migrations", "003_create_video_metadata.sql")
        ]
        
        for migration in migrations:
            print(f"Applying migration: {migration}...")
            with open(migration, "r", encoding="utf-8") as f:
                sql = f.read()
            cursor.execute(sql)
            
        print("All migrations applied successfully! Database schema is ready.")
    except Exception as e:
        print(f"Error applying migrations: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()
