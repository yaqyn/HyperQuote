# Customers

Customer accounts. One row per customer — RFQs and quotes reference by id.
The sales panel, the customer-service panel, and the finance panel all read
from this single source.

Schema: `{ id, companyName, tier, status, contactName, phone, email, address,
city, creditLimit, currentExposure, orderCount, lifetimeValue, avgMargin,
paymentHistory, assignedSalesRep, joinedAtDaysAgo }`

```json
[
  {
    "id": "cust-001",
    "companyName": "Al-Nour Construction",
    "tier": "A",
    "status": "active",
    "contactName": "Hossam El-Din",
    "phone": "+20 2 3760 1188",
    "email": "hossam@al-nour.eg",
    "address": "15 Tahrir Street, Dokki, Giza",
    "city": "Giza, Dokki",
    "creditLimit": 5000000,
    "currentExposure": 2100000,
    "orderCount": 47,
    "lifetimeValue": 18500000,
    "avgMargin": 19.2,
    "paymentHistory": "excellent",
    "assignedSalesRep": "Ahmed Hassan",
    "joinedAtDaysAgo": 820
  },
  {
    "id": "cust-003",
    "companyName": "Pyramid Builders",
    "tier": "A",
    "status": "active",
    "contactName": "Mostafa El-Sayed",
    "phone": "+20 2 3382 4410",
    "email": "mostafa@pyramidbuild.eg",
    "address": "8 Tahrir Street, Dokki, Giza",
    "city": "Giza, 6th October",
    "creditLimit": 4000000,
    "currentExposure": 1200000,
    "orderCount": 34,
    "lifetimeValue": 11900000,
    "avgMargin": 20.5,
    "paymentHistory": "excellent",
    "assignedSalesRep": "Ahmed Hassan",
    "joinedAtDaysAgo": 680
  },
  {
    "id": "cust-006",
    "companyName": "Maadi Engineering",
    "tier": "new",
    "status": "active",
    "contactName": "Reem Abdelaziz",
    "phone": "+20 2 2358 9900",
    "email": "reem@maadieng.eg",
    "address": "22 Road 9, Maadi, Cairo",
    "city": "Cairo, Maadi",
    "creditLimit": 500000,
    "currentExposure": 0,
    "orderCount": 1,
    "lifetimeValue": 180000,
    "avgMargin": 18.0,
    "paymentHistory": "good",
    "assignedSalesRep": "Omar Khalil",
    "joinedAtDaysAgo": 14
  }
]
```
