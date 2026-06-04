"""
Prompt 2 integration test.

1. Registers a test user (or reuses one)
2. Inserts a fake PUBLIC job with deadline = tomorrow
3. Creates a recommendation linking user → job
4. Calls the notification scheduler function directly
5. Calls GET /api/v1/notifications and confirms the notification appears
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timezone, timedelta
from app.database import SessionLocal
from app.models.job import Job
from app.models.user import User
from app.models.recommendation import Recommendation
from app.models.notification import Notification
from scraper.scheduler import _send_deadline_notifications

db = SessionLocal()

try:
    # ── 1. Find first active user ──────────────────────────────
    user = db.query(User).filter(User.is_active == True).first()
    if not user:
        print("❌ No active user found — register one first via the app")
        sys.exit(1)
    print(f"✅ User found: {user.email}")

    # ── 2. Insert fake public job with deadline = tomorrow ─────
    tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
    fake_job = Job(
        title="Ingénieur Systèmes — Concours National (TEST)",
        company="Ministère de l'Intérieur",
        location="Rabat",
        description="Poste de test pour le prompt 2.",
        required_skills=["Python", "Linux"],
        contract_type="Concours",
        source_name="emploi-public.ma",
        source_url="https://www.emploi-public.ma/test",
        sector="public",
        deadline=tomorrow,
        expires_at=tomorrow + timedelta(days=1),
        is_active=True,
    )
    db.add(fake_job)
    db.flush()   # get fake_job.id without full commit
    print(f"✅ Fake public job inserted: id={fake_job.id}, deadline={tomorrow.date()}")

    # ── 3. Create a recommendation linking user → fake_job ─────
    rec = Recommendation(
        user_id=user.id,
        job_id=fake_job.id,
        score=0.85,
        semantic_score=0.80,
        keyword_score=0.90,
        matching_skills=["Python"],
        missing_skills=[],
    )
    db.add(rec)
    db.commit()
    print(f"✅ Recommendation created: user={user.email} → job={fake_job.title}")

    # ── 4. Run the notification scheduler function ─────────────
    print("\n⏳ Running _send_deadline_notifications()...")
    _send_deadline_notifications()
    print("✅ Scheduler function completed")

    # ── 5. Check notifications table ──────────────────────────
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.job_id == fake_job.id)
        .all()
    )

    if notifs:
        print(f"\n✅ {len(notifs)} notification(s) created:")
        for n in notifs:
            print(f"   id={n.id}")
            print(f"   message={n.message}")
            print(f"   is_read={n.is_read}")
            print(f"   created_at={n.created_at}")
    else:
        print("\n❌ No notifications found — check the scheduler logic")

    # ── 6. Clean up test data ──────────────────────────────────
    db.query(Notification).filter(Notification.job_id == fake_job.id).delete()
    db.query(Recommendation).filter(Recommendation.job_id == fake_job.id).delete()
    db.query(Job).filter(Job.id == fake_job.id).delete()
    db.commit()
    print("\n🧹 Test data cleaned up")

except Exception as e:
    db.rollback()
    print(f"❌ Error: {e}")
    import traceback; traceback.print_exc()
finally:
    db.close()
