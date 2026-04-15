# Sales reps

Internal sales team roster. Drives auto-assignment, SLA dashboards, and
activity feeds. Edit here to add/remove team members.

Schema: `{ id, name, role, activeRfqs, specialization[], territories[] }`

```json
[
  { "id": "user-1", "name": "Ahmed Hassan", "role": "senior", "activeRfqs": 7, "specialization": ["cement", "steel"], "territories": ["cairo", "giza"] },
  { "id": "user-2", "name": "Fatma Nour", "role": "mid", "activeRfqs": 4, "specialization": ["blocks", "finishing"], "territories": ["alexandria", "delta"] },
  { "id": "user-3", "name": "Omar Khalil", "role": "mid", "activeRfqs": 9, "specialization": ["cement", "blocks"], "territories": ["cairo", "suez"] },
  { "id": "user-4", "name": "Sara Ibrahim", "role": "junior", "activeRfqs": 3, "specialization": ["plywood", "finishing"], "territories": ["giza", "fayoum"] },
  { "id": "user-5", "name": "Hassan El-Masry", "role": "senior", "activeRfqs": 5, "specialization": ["steel", "roofing"], "territories": ["cairo", "helwan"] }
]
```
