from sqlalchemy import create_engine, text
engine = create_engine("postgresql://smartrecruit:smartrecruit_pass@localhost:5432/smartrecruit_db")
with engine.connect() as c:
    rows = c.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).fetchall()
    print("Tables in DB:", [r[0] for r in rows])
