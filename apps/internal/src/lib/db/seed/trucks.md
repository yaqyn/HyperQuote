# Trucks

The dock fleet — each row is one physical truck available for loading at
the warehouse. The admin panel (future phase) will CRUD these. For now,
seed data only.

Schema: `{ id, plateNumber, driverName, driverPhone, capacityTons, bodyType, status }`

`status` is the live availability signal:
  - `available` — on the dock, ready to be assigned
  - `loading` — currently loading an order
  - `dispatched` — left the yard with goods
  - `maintenance` — temporarily unavailable

```json
[
  {
    "id": "trk-001",
    "plateNumber": "CAI-1842",
    "driverName": "Mahmoud El-Sayed",
    "driverPhone": "+20 101 234 5678",
    "capacityTons": 12,
    "bodyType": "flatbed",
    "status": "available"
  },
  {
    "id": "trk-002",
    "plateNumber": "CAI-2273",
    "driverName": "Ahmed Farouk",
    "driverPhone": "+20 102 345 6789",
    "capacityTons": 8,
    "bodyType": "curtain-side",
    "status": "available"
  },
  {
    "id": "trk-003",
    "plateNumber": "GIZ-0915",
    "driverName": "Youssef Khaled",
    "driverPhone": "+20 103 456 7890",
    "capacityTons": 18,
    "bodyType": "flatbed",
    "status": "dispatched"
  },
  {
    "id": "trk-004",
    "plateNumber": "CAI-4401",
    "driverName": "Tarek Mostafa",
    "driverPhone": "+20 104 567 8901",
    "capacityTons": 6,
    "bodyType": "box",
    "status": "loading"
  },
  {
    "id": "trk-005",
    "plateNumber": "ALX-1156",
    "driverName": "Hassan Ibrahim",
    "driverPhone": "+20 105 678 9012",
    "capacityTons": 24,
    "bodyType": "flatbed",
    "status": "available"
  },
  {
    "id": "trk-006",
    "plateNumber": "CAI-3320",
    "driverName": "Omar Abdel-Rahman",
    "driverPhone": "+20 106 789 0123",
    "capacityTons": 10,
    "bodyType": "curtain-side",
    "status": "available"
  },
  {
    "id": "trk-007",
    "plateNumber": "GIZ-2004",
    "driverName": "Khaled Zaki",
    "driverPhone": "+20 107 890 1234",
    "capacityTons": 15,
    "bodyType": "flatbed",
    "status": "dispatched"
  },
  {
    "id": "trk-008",
    "plateNumber": "CAI-5512",
    "driverName": "Samir Naguib",
    "driverPhone": "+20 108 901 2345",
    "capacityTons": 8,
    "bodyType": "box",
    "status": "available"
  }
]
```
