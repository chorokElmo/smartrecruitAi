import sys, io, json, urllib.request
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

r = urllib.request.urlopen("http://localhost:8000/api/v1/jobs?page=1&size=8")
data = json.loads(r.read().decode("utf-8"))
print(f"Total jobs in DB: {data['total']}")
print()
for job in data["items"]:
    print(f"  {job['title'][:60]}")
    print(f"    Company : {job['company']}")
    print(f"    Location: {job['location']}")
    print(f"    Type    : {job['contract_type']}")
    print(f"    Skills  : {job['required_skills']}")
    print(f"    URL     : {(job['source_url'] or '')[:60]}")
    print()
