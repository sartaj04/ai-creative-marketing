# Pixo — Feature Status vs Pricing Plans

> Last updated: 2026-03-18

## Pricing Plans Overview

| | **Starter** (₹1,600/mo) | **Pro** (₹3,460/mo) |
|---|---|---|
| Word Limit | 50K words/month | 100K words/month |
| Content Inspiration | ✅ | ✅ |
| Generate Ideas | ✅ | ✅ |
| Generate Posts | ✅ | ✅ |
| Post Styling | ✅ | ✅ |
| Post Preview | ✅ | ✅ |
| Scheduling | ✅ | ✅ |
| Auto-add First Comment | ✅ | ✅ |
| Posts Generated for You | ✅ | ✅ |
| Analytics | — | ✅ |
| Create & Publish Carousels | — | ✅ |
| Engage & Grow | — | ✅ |

---

## ✅ Implemented

| Feature | Status | Notes |
|---|---|---|
| **Content Inspiration** | ✅ Done | Covered by Generate Content workflow & goal selector |
| **Generate Ideas** | ✅ Done | Idea generation via multi-agent pipeline |
| **Generate Posts** | ✅ Done | Full content generation with Review Inbox & Content Pipeline |
| **Post Styling** | ✅ Done | Draft editor + Image & Carousel template makers |
| **Post Preview** | ✅ Done | Live preview in draft editor |
| **Analytics** | ✅ Done | `/dashboard/analytics` page exists |
| **Create Carousels** | ✅ Done | Carousel Template maker is built (publishing pending Scheduling) |

---

## ❌ Missing / Incomplete

### 1. Word Count Limits (50K / 100K per month)
- **Status:** 🔴 Missing
- **What's needed:**
  - Billing / subscription system (Stripe or Razorpay integration)
  - Credit metering per generation (track words used)
  - Plan-based limits & gating (Starter vs Pro)
  - Usage dashboard for the user

### 2. Scheduling & Publishing
- **Status:** 🟡 In Progress (architecture discussed, not built)
- **What's needed:**
  - Scheduling calendar UI in the dashboard
  - Backend task queue (Celery / BullMQ / cron) for timed publishing
  - Social media API integrations (LinkedIn, Twitter/X, etc.)
  - Draft → Scheduled → Published state machine

### 3. Auto-add First Comment
- **Status:** 🔴 Missing
- **What's needed:**
  - UI toggle on the post editor to enable/disable first comment
  - Backend logic to post a follow-up comment immediately after publishing
  - Platform-specific API handling (LinkedIn comment API, etc.)

### 4. Posts Generated for You (Autonomous)
- **Status:** 🟡 Partially Done
- **What's needed:**
  - Fully autonomous pipeline that fills the calendar without user action
  - Cron-based batch generation using brand DNA & content strategy
  - Auto-populate the Review Inbox on a schedule
- **What exists:** Manual batch generation via Generate Content flow

### 5. Engage & Grow
- **Status:** 🔴 Missing
- **What's needed:**
  - Social CRM / engagement stream in the dashboard
  - Monitor mentions, comments, and replies
  - Reply to comments directly from Pixo
  - Engagement analytics (replies sent, response time, etc.)

---

## 📋 Recommended Priority Order

1. **Scheduling & Publishing** — Unlocks the core value proposition
2. **Credit / Billing System** — Required for monetization (word limits)
3. **Auto-add First Comment** — Quick win once publishing is live
4. **Posts Generated for You** — Automation layer on top of scheduling
5. **Engage & Grow** — Largest scope, build after core loop is solid
