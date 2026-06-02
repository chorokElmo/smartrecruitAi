"""
Seed the database with realistic Moroccan job listings (English titles for portability).
Run: .venv/Scripts/python.exe seed_jobs.py
"""
from app.database import SessionLocal
from app.models.job import Job
from datetime import datetime, timedelta, timezone


def now():
    return datetime.now(timezone.utc)


JOBS = [
    {
        "title": "Full Stack Developer Python / React",
        "company": "CBI Maroc",
        "location": "Casablanca",
        "description": (
            "Join our tech team to build innovative banking solutions. "
            "You will work on REST APIs with FastAPI and a modern React interface."
        ),
        "required_skills": ["Python", "FastAPI", "React", "PostgreSQL", "Docker", "Git"],
        "contract_type": "CDI",
        "source_name": "LinkedIn",
        "source_url": "https://www.linkedin.com/jobs/search/?keywords=Full+Stack+Python+React+Maroc",
        "deadline": now() + timedelta(days=30),
    },
    {
        "title": "Backend Java Developer Internship",
        "company": "Attijariwafa Bank",
        "location": "Casablanca",
        "description": (
            "6-month end-of-studies internship within the IT department. "
            "Development of Java Spring Boot microservices for online payment systems."
        ),
        "required_skills": ["Java", "Spring Boot", "SQL", "REST API", "Maven", "Git"],
        "contract_type": "Stage",
        "source_name": "ANAPEC",
        "source_url": "https://www.anapec.org/sigec-app-rv/chercheurs/affichageOffre/index/annonce/",
        "deadline": now() + timedelta(days=20),
    },
    {
        "title": "Data Scientist - NLP & Machine Learning",
        "company": "OCP Group",
        "location": "Rabat",
        "description": (
            "We are looking for a Data Scientist passionate about NLP to analyze industrial data "
            "and build predictive models for our logistics chain."
        ),
        "required_skills": ["Python", "Machine Learning", "NLP", "scikit-learn", "Pandas", "NumPy", "SQL"],
        "contract_type": "CDI",
        "source_name": "LinkedIn",
        "source_url": "https://www.linkedin.com/jobs/search/?keywords=Data+Scientist+NLP+Maroc",
        "deadline": now() + timedelta(days=45),
    },
    {
        "title": "DevOps Engineer",
        "company": "Maroc Telecom",
        "location": "Rabat",
        "description": (
            "Join the infrastructure team to automate CI/CD pipelines, manage cloud "
            "infrastructure and improve service reliability."
        ),
        "required_skills": ["Docker", "Kubernetes", "CI/CD", "Linux", "AWS", "Terraform", "Git"],
        "contract_type": "CDI",
        "source_name": "Company Website",
        "source_url": "https://www.iam.ma/particuliers/Espace-Recrutement.html",
        "deadline": now() + timedelta(days=25),
    },
    {
        "title": "Frontend Developer React / Next.js",
        "company": "Fiverr Morocco",
        "location": "Casablanca",
        "description": (
            "Develop performant and accessible user interfaces for our marketplace. "
            "Stack: React, Next.js, TypeScript, Tailwind CSS."
        ),
        "required_skills": ["React", "Next.js", "TypeScript", "Tailwind CSS", "Git", "REST API"],
        "contract_type": "CDD",
        "source_name": "LinkedIn",
        "source_url": "https://www.linkedin.com/jobs/search/?keywords=Frontend+React+Next.js+Maroc",
        "deadline": now() + timedelta(days=15),
    },
    {
        "title": "Mobile Developer Flutter - Internship",
        "company": "BMCE Bank of Africa",
        "location": "Casablanca",
        "description": (
            "4 to 6 month PFE internship to develop the next-generation mobile banking app "
            "with Flutter. You will join a dynamic Agile team."
        ),
        "required_skills": ["Flutter", "Dart", "REST API", "Git", "Agile"],
        "contract_type": "Stage",
        "source_name": "ANAPEC",
        "source_url": "https://www.anapec.org/sigec-app-rv/chercheurs/affichageOffre/index/annonce/",
        "deadline": now() + timedelta(days=18),
    },
    {
        "title": "AI Engineer / Deep Learning",
        "company": "Inwi",
        "location": "Casablanca",
        "description": (
            "You will join our R&D center to design deep learning models applied "
            "to content recommendation and fraud detection."
        ),
        "required_skills": ["Python", "Deep Learning", "TensorFlow", "PyTorch", "Pandas", "NumPy", "SQL"],
        "contract_type": "CDI",
        "source_name": "LinkedIn",
        "source_url": "https://www.linkedin.com/jobs/search/?keywords=AI+Engineer+Deep+Learning+Maroc",
        "deadline": now() + timedelta(days=35),
    },
    {
        "title": "Backend Developer Node.js",
        "company": "Sofrecom Maroc",
        "location": "Rabat",
        "description": (
            "Development and maintenance of REST APIs for international telecom projects. "
            "Hybrid work environment with occasional travel."
        ),
        "required_skills": ["JavaScript", "Node.js", "Express", "PostgreSQL", "Redis", "Docker", "Git"],
        "contract_type": "CDI",
        "source_name": "Company Website",
        "source_url": "https://www.sofrecom.com/fr/rejoignez-nous/offres-emploi.html",
        "deadline": now() + timedelta(days=40),
    },
    {
        "title": "Data Analyst / BI Internship",
        "company": "Centrale Danone",
        "location": "Casablanca",
        "description": (
            "3 to 6 month Business Intelligence internship. Create Power BI dashboards, "
            "analyze sales data and optimize reporting processes."
        ),
        "required_skills": ["SQL", "Power BI", "Excel", "Python", "Pandas", "Data Analysis"],
        "contract_type": "Stage",
        "source_name": "ANAPEC",
        "source_url": "https://www.anapec.org/sigec-app-rv/chercheurs/affichageOffre/index/annonce/",
        "deadline": now() + timedelta(days=12),
    },
    {
        "title": "Python / FastAPI Developer",
        "company": "Capgemini Maroc",
        "location": "Casablanca",
        "description": (
            "Join our Digital Practice to develop Python microservices and data pipelines "
            "for our major enterprise clients."
        ),
        "required_skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "REST API", "Git", "Agile"],
        "contract_type": "CDI",
        "source_name": "LinkedIn",
        "source_url": "https://www.linkedin.com/jobs/search/?keywords=Python+FastAPI+Developer+Maroc",
        "deadline": now() + timedelta(days=28),
    },
    {
        "title": "Linux Systems Administrator",
        "company": "Ministry of National Education",
        "location": "Rabat",
        "description": (
            "Management and maintenance of Linux servers for the national education portal. "
            "PostgreSQL database administration and monitoring."
        ),
        "required_skills": ["Linux", "PostgreSQL", "Bash", "Nginx", "Git"],
        "contract_type": "CDI",
        "source_name": "Emploi Public",
        "source_url": "https://www.emploi-public.ma/fr/concoursListe.aspx",
        "deadline": now() + timedelta(days=50),
    },
    {
        "title": "Full Stack JavaScript Developer",
        "company": "Sqli Group",
        "location": "Rabat",
        "description": (
            "Development of modern web applications with Vue.js on the frontend and Node.js "
            "on the backend. You will work in a Scrum team on e-commerce projects."
        ),
        "required_skills": ["JavaScript", "Vue", "Node.js", "MongoDB", "REST API", "Git", "Scrum"],
        "contract_type": "CDI",
        "source_name": "LinkedIn",
        "source_url": "https://www.linkedin.com/jobs/search/?keywords=Full+Stack+JavaScript+Maroc",
        "deadline": now() + timedelta(days=22),
    },
]


def seed():
    db = SessionLocal()
    try:
        existing = db.query(Job).count()
        if existing > 0:
            print(f"Database already has {existing} jobs. Skipping seed.")
            return
        jobs = [Job(**j) for j in JOBS]
        db.bulk_save_objects(jobs)
        db.commit()
        print(f"[OK] Seeded {len(jobs)} jobs successfully.")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
