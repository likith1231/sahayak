<div align="center">

# 🌾 Sahayak

### *Farm-fresh. Direct. Trusted.*

**A farmer-to-consumer marketplace that connects local farmers directly with buyers. It adds home delivery with live tracking, AI assistance and an emergency food network.**

<br/>

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white)

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_+_pgvector-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)
![Razorpay](https://img.shields.io/badge/Razorpay-0C2451?style=for-the-badge&logo=razorpay&logoColor=white)

![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=flat-square&logo=vercel)
![Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render&logoColor=black)

<br/>

[✨ Features](#-features) •
[🏗️ Architecture](#️-architecture) •
[🚚 Order Tracking](#-delivery--order-tracking) •
[🚀 Getting Started](#-getting-started) •
[📡 API](#-api-reference) •
[🎨 Design](#-design-system)

</div>

---

## 📖 About

Farmers in India often sell through layers of middlemen. That lowers what they earn and raises what consumers pay. **Sahayak** (सहायक, *"helper"*) removes those layers:

- 🧑‍🌾 **Farmers** list produce, get fair prices and fulfill orders from a simple dashboard
- 🛒 **Consumers** buy fresh produce straight from the farm, with **home delivery** or **pickup**
- 🤝 **NGOs and community kitchens** coordinate food during emergencies
- 🤖 **AI** helps everyone. It answers questions, creates listings from voice and predicts prices

The app is built for **Karnataka**: distribution centers (mandis) across the state, delivery to Karnataka pincodes, and support for Indian languages.

---

## ✨ Features

### 🛒 For Consumers

| Feature | Description |
|---|---|
| 🥬 **Marketplace** | Browse produce by category (Vegetables, Fruits, Grains, Spices) with filter chips |
| 🛍️ **Cart & Checkout** | Multi-item cart, a free-delivery progress bar and a step-by-step checkout |
| 🚚 **Home Delivery or Pickup** | Choose delivery to your door or pickup from a distribution center |
| 📍 **Saved Addresses** | Address book with labels (Home / Work / Other) and a default address |
| ⏰ **Delivery Slots** | Pick from morning, afternoon or evening slots for the next 5 days |
| 💳 **Payments** | Razorpay (card / UPI) or **cash on delivery / pickup** |
| 📦 **Live Order Tracking** | Visual progress tracker, ETA, tracking history and live updates |
| 🔐 **Handover Code** | A 4-digit code makes sure the order reaches the right person |
| ⭐ **Ratings & Reviews** | Rate delivered orders and leave feedback for the farmer |
| 🔁 **Buy Again** | Reorder past purchases in one click |
| 🧾 **Invoices** | Printable invoice for every order |
| 🔔 **Notifications** | A bell in the navbar for every status update |

### 🧑‍🌾 For Farmers

| Feature | Description |
|---|---|
| 📝 **Listing Management** | Create and edit listings with crop-specific price and unit checks |
| 🎙️ **Voice Listings** | Create a listing by voice, filled in by AI |
| 📊 **Fulfillment Dashboard** | Orders to fulfill, deliveries due today, completed orders and earnings |
| ✅ **One-tap Status Updates** | Confirm → Pack → Ship → Out for delivery → Delivered |
| ❌ **Reject Orders** | Reject before packing, with stock restored automatically |
| 💹 **Mandi Prices** | Live market prices synced daily from Agmarknet |

### 🤝 For NGOs, Kitchens & Admins

| Feature | Description |
|---|---|
| 🚨 **Emergency Requests** | Raise urgent food needs with location; requests are grouped by area for responders |
| 🍲 **Kitchen Partners & Food Pledges** | Community kitchens pledge meal capacity during crises |
| 🌧️ **Emergency Windows** | District-level crisis windows triggered by weather alerts |
| 🏢 **NGO Verification** | NGOs register, and admins review and verify them |
| 📈 **Admin Analytics** | Platform-wide statistics |

### 🤖 AI & Smart Features

| Feature | Description |
|---|---|
| 💬 **AI Chat Assistant** | Floating chat widget powered by **Google Gemini** with RAG over listings and mandi prices (pgvector embeddings) |
| 🌐 **Translation** | Translate content into Indian languages (Kannada, Hindi, Tamil, Telugu…) |
| 📉 **Price Prediction** | ML microservice that suggests crop prices (currently a placeholder model) |
| 🔍 **Crop Grading** | Upload a crop photo to get a quality grade (currently a placeholder model) |

---

## 🏗️ Architecture

```mermaid
flowchart LR
    U["👤 Users<br/>Consumers · Farmers · NGOs · Admins"]

    subgraph FE["🖥️ Frontend · Vercel"]
        N["Next.js 16 · React 19<br/>Tailwind v4 · Three.js"]
    end

    subgraph BE["⚙️ Backend · Render"]
        API["FastAPI<br/>REST API · JWT auth"]
        SCH["⏱️ APScheduler<br/>price sync · weather alerts"]
    end

    ML["🧠 ML Service<br/>FastAPI"]
    DB[("🐘 PostgreSQL<br/>+ pgvector")]

    subgraph EXT["🌐 External Services"]
        G["Google Gemini"]
        R["Razorpay"]
        RS["Resend email"]
        A["Agmarknet"]
        MM["MyMemory translation"]
    end

    U --> N
    N -->|REST + JWT| API
    API --> DB
    SCH --> DB
    API --> G
    API --> R
    API --> RS
    API --> MM
    SCH --> A
    N -.-> ML
```

### 📁 Project Structure

```
sahayak/
├── 📂 app/                      # Next.js App Router (frontend)
│   ├── 📂 components/           # Navbar, ChatWidget, OrderTracker, AddressBook…
│   │   └── 📂 3d/               # React Three Fiber ambient background
│   ├── 📂 context/              # AuthContext (JWT session)
│   ├── 📂 lib/                  # api.ts, orders.ts, categoryStyles, cropImages
│   ├── 📂 listings/             # Marketplace + listing details
│   ├── 📂 cart/ · checkout/     # Cart and the checkout flow
│   ├── 📂 orders/               # My Orders + /orders/[id] live tracking
│   ├── 📂 farmer/               # Farmer listings & fulfillment dashboard
│   ├── 📂 emergency/ · ngo/     # Emergency network & NGO registration
│   ├── 📂 mandis/ · admin/      # Distribution centers & admin panel
│   └── 📂 profile/              # Profile, order history, saved addresses
│
├── 📂 backend/                  # FastAPI backend
│   ├── 📂 app/
│   │   ├── 📂 routers/          # auth, listings, cart, checkout, orders, delivery…
│   │   ├── 📂 services/         # delivery, payment, email, agmarknet, weather
│   │   ├── 📂 auth/             # JWT + password hashing
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schema_sync.py       # Idempotent schema upgrades on startup
│   │   └── main.py              # App entry, middleware, schedulers
│   └── 📂 alembic/              # Database migrations
│
├── 📂 ml_service/               # Price prediction & crop grading microservice
└── 📂 prisma/                   # Legacy Prisma schema (Next.js API routes)
```

---

## 🚚 Delivery & Order Tracking

Order tracking works like the big e-commerce apps, built around how farm produce is actually handled.

### 📦 Order lifecycle

```mermaid
flowchart LR
    P["📝 Placed"] --> C["✅ Confirmed"] --> K["📦 Packed"]
    K -->|Home delivery| S["🚛 Shipped"] --> O["🛵 Out for delivery"] --> D["🎉 Delivered"]
    K -->|Pickup| R["🏪 Ready for pickup"] --> D2["🙌 Picked up"]
    P -.->|cancel| X["❌ Cancelled"]
    C -.->|cancel / reject| X
    K -.->|cancel| X
```

### 🔑 How it works

- 🧾 **Tracking numbers.** Every order gets a unique ID, for example `SHK2610028AI4H6`.
- 🕒 **Timeline.** Every status change is recorded with a timestamp, an optional location and a note.
- 🔐 **Handover code.** Only the buyer sees a 4-digit code. The farmer must enter it to mark the order delivered.
- 💵 **Cash on delivery.** Payment is marked **Paid** automatically when the order is handed over.
- ↩️ **Cancellations.** Stock goes back on the listing automatically, and Razorpay refunds start automatically for online payments.
- 📡 **Live updates.** The tracking page refreshes every 20 seconds and shows a toast when the status changes.

### 🚛 Delivery rules

| Rule | Value |
|---|---|
| 📍 Delivery area | Karnataka pincodes (`56xxxx`–`59xxxx`) |
| ⏰ Time slots | 🌅 8 AM–12 PM · ☀️ 12–4 PM · 🌆 4–8 PM (IST) |
| 📅 Booking window | Next 5 days, at least 6 hours ahead |
| 🏙️ Outside Bengaluru | Delivery starts one day later |
| 💰 Delivery fee | **₹40**, or **FREE** on orders of ₹500+ |

---

## 🛠️ Tech Stack

<table>
<tr>
<td valign="top" width="33%">

### 🖥️ Frontend
- **Next.js 16** (App Router)
- **React 19** + TypeScript
- **Tailwind CSS v4**
- **React Three Fiber** + Drei
- react-hot-toast

</td>
<td valign="top" width="33%">

### ⚙️ Backend
- **FastAPI** + Uvicorn
- **SQLAlchemy 2** + Alembic
- **PostgreSQL** + **pgvector**
- JWT (python-jose) + bcrypt
- APScheduler

</td>
<td valign="top" width="33%">

### 🌐 Integrations
- **Google Gemini** (chat + embeddings)
- **Razorpay** payments
- **Resend** email
- **Agmarknet** mandi prices
- **MyMemory** translation

</td>
</tr>
</table>

---

## 🚀 Getting Started

### ✅ Prerequisites

- **Node.js** 20+
- **Python** 3.11+
- **PostgreSQL** 14+ with the [`pgvector`](https://github.com/pgvector/pgvector) extension (or a hosted database such as Neon)

### 1️⃣ Clone the repository

```bash
git clone https://github.com/likith1231/sahayak.git
cd sahayak
```

### 2️⃣ Set up the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql://user:password@host:5432/sahayak
JWT_SECRET=your-long-random-secret
ALLOWED_ORIGINS=http://localhost:3000

# Optional integrations
GEMINI_API_KEY=...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RESEND_API_KEY=...
AGMARKNET_API_KEY=...
```

Run migrations, add sample data and start the server:

```bash
alembic upgrade head
python seed_data.py             # optional: sample data
uvicorn app.main:app --reload --port 8000
```

> 💡 The backend also applies the delivery and tracking schema changes on startup (`app/schema_sync.py`), so hosts that only run `uvicorn` stay up to date.

### 3️⃣ Set up the frontend

```bash
# from the project root
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_RAZORPAY_KEY_ID=...   # optional
```

```bash
npm run dev
```

🎉 Open **http://localhost:3000**. The API docs are at **http://localhost:8000/docs**.

### 4️⃣ ML service (optional)

```bash
cd ml_service
uv sync
uv run uvicorn main:app --port 8001
```

---

## 🔐 Environment Variables

| Variable | Where | Required | Purpose |
|---|---|:---:|---|
| `DATABASE_URL` | Backend | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | Backend | ✅ | Signs authentication tokens |
| `ALLOWED_ORIGINS` | Backend | ✅ | Comma-separated frontend URLs for CORS |
| `GEMINI_API_KEY` | Backend | ⚪ | AI chat assistant & voice listings |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Backend | ⚪ | Online payments & automatic refunds |
| `RESEND_API_KEY` | Backend | ⚪ | Order confirmation emails |
| `AGMARKNET_API_KEY` | Backend | ⚪ | Daily mandi price sync |
| `NEXT_PUBLIC_API_URL` | Frontend | ✅ | Backend base URL |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Frontend | ⚪ | Razorpay checkout key |

✅ required · ⚪ optional (the related feature is turned off when it's missing)

---

## 📡 API Reference

All endpoints are served from the FastAPI backend. Interactive documentation is available at **`/docs`**.

<details>
<summary><b>🔑 Auth & Profile</b></summary>

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create an account (Farmer / Consumer / NGO…) |
| `POST` | `/api/auth/login` | Log in with phone or email |
| `GET` | `/api/auth/me` | Current user profile |

</details>

<details>
<summary><b>🥬 Listings, Cart & Checkout</b></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/listings` | Browse listings (`?category=`) |
| `POST` | `/api/listings` | Create a listing (farmer) |
| `GET` / `PATCH` | `/api/listings/{id}` | View / update a listing |
| `GET` | `/api/cart` | Current cart |
| `POST` | `/api/cart/items` | Add to cart |
| `PUT` / `DELETE` | `/api/cart/items/{id}` | Update / remove a cart item |
| `POST` | `/api/checkout` | Place an order (delivery or pickup) |
| `POST` | `/api/checkout/verify` | Verify a Razorpay payment |

</details>

<details>
<summary><b>🚚 Orders, Delivery & Tracking</b></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/orders` | Consumer's orders, with tracking |
| `GET` | `/api/orders/farmer` | Farmer's sales |
| `GET` | `/api/orders/{id}` | Order details + timeline |
| `PATCH` | `/api/orders/{id}/status` | Move an order to its next step (farmer) |
| `POST` | `/api/orders/{id}/cancel` | Cancel (consumer) or reject (farmer) |
| `POST` | `/api/orders/{id}/rate` | Rate a delivered order |
| `GET` | `/api/delivery/slots` | Available delivery slots |
| `GET` | `/api/delivery/serviceability` | Check whether a pincode can get delivery |
| `GET` / `POST` | `/api/addresses` | List / add saved addresses |
| `PUT` / `DELETE` | `/api/addresses/{id}` | Edit / delete an address |

</details>

<details>
<summary><b>🚨 Emergency, NGO & Admin</b></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` / `POST` | `/api/emergency` | List / raise emergency requests |
| `GET` | `/api/emergency/nearby` | Grouped requests, pledges & active windows |
| `POST` | `/api/emergency/kitchens` | Register a kitchen partner |
| `POST` | `/api/emergency/pledges` | Pledge food capacity |
| `POST` | `/api/ngo/register` | Register an NGO |
| `GET` | `/api/admin/ngos/pending` | NGOs waiting for verification |
| `GET` | `/api/admin/analytics` | Platform analytics |

</details>

<details>
<summary><b>🤖 AI, Mandis & Utilities</b></summary>

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/agent/chat` | AI assistant (Gemini + RAG) |
| `POST` | `/api/agent/listing-from-voice` | Create a listing from voice |
| `POST` | `/api/translate` | Translate text |
| `GET` | `/api/mandis` | Distribution centers |
| `GET` | `/api/notifications` | User notifications |
| `PATCH` | `/api/notifications/read-all` | Mark all notifications as read |

</details>

---

## 🎨 Design System

A warm, earthy palette inspired by fields and fresh produce, with frosted-glass cards over a subtle 3D background.

| | Token | Hex | Usage |
|:---:|---|---|---|
| ![#2D6A4F](https://placehold.co/20x20/2D6A4F/2D6A4F.png) | `primary` | `#2D6A4F` | Brand green: buttons, links |
| ![#40916C](https://placehold.co/20x20/40916C/40916C.png) | `primary-light` | `#40916C` | Hover states |
| ![#D4A373](https://placehold.co/20x20/D4A373/D4A373.png) | `accent` | `#D4A373` | Warm highlights, tags |
| ![#FEFAE0](https://placehold.co/20x20/FEFAE0/FEFAE0.png) | `cream` | `#FEFAE0` | Page background |
| ![#2B2D42](https://placehold.co/20x20/2B2D42/2B2D42.png) | `charcoal` | `#2B2D42` | Headings, text |
| ![#B91C1C](https://placehold.co/20x20/B91C1C/B91C1C.png) | `emergency` | `#B91C1C` | Emergency alerts |

- 🔤 **Typography:** Geist Sans
- 🪟 **Glassmorphism:** `.glass-card` and `.glass-card-strong` utilities
- 🌐 **3D background:** a single React Three Fiber canvas whose intensity changes by page and stays low on data-heavy pages
- 📱 **Responsive:** works from 390px phones to wide desktops

> 📘 See [`AGENTS.md`](./AGENTS.md) for the full design and architecture notes.

---

## ☁️ Deployment

| Part | Platform | Notes |
|---|---|---|
| 🖥️ Frontend | **Vercel** | Set `NEXT_PUBLIC_API_URL` to the backend URL |
| ⚙️ Backend | **Render** | Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (root: `backend/`) |
| 🐘 Database | **PostgreSQL + pgvector** | Neon or any managed Postgres |

> ⚠️ On Render's free plan the backend sleeps when idle, so the first request after a quiet period can take up to about a minute.

---

## 🗺️ Roadmap

- [ ] ⭐ Show farmers' average ratings on listings
- [ ] 💖 Wishlist and "notify me when back in stock"
- [ ] 📉 Low-stock alerts for farmers
- [ ] 📲 SMS / WhatsApp order updates
- [ ] 🛠️ Admin order management console
- [ ] 🧠 Real price-prediction and crop-grading models

---

## 🤝 Contributing

Contributions are welcome!

1. 🍴 Fork the repository
2. 🌿 Create a branch: `git checkout -b feature/amazing-feature`
3. 💾 Commit your changes: `git commit -m "Add amazing feature"`
4. 🚀 Push the branch: `git push origin feature/amazing-feature`
5. 📬 Open a pull request

---

<div align="center">

### 🌱 Built to support local farmers

**Sahayak** · *Helping farmers. Feeding communities.*

⭐ **Star this repo if you find it useful!** ⭐

</div>
