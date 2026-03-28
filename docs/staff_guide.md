# Dinely — Staff Guide

**Who is this guide for?** This guide is for the front-of-house team — hosts, servers, and managers who need to use the Staff Dashboard on a daily basis during a shift. No technical experience needed.

---

## Your Role as Staff

Your job in Dinely is simple: you are the link between what happens on the screen and what happens in the physical dining room. You greet guests, check them in on the dashboard, and mark tables as free when guests leave. The system does the rest.

```mermaid
graph TD
    A["👩‍💼 Staff Member"] --> B["Check today's reservations"]
    A --> C["Greet arriving guests"]
    A --> D["Mark table as Seated"]
    A --> E["Manage walk-ins"]
    A --> F["Clear table when guest leaves"]

    style A fill:#5e8b6a,color:#ffffff,font-weight:bold
```

---

## Logging In

Your manager will send you an invitation email before your first shift. Once you have set your password, you log in at the Staff Login page.

```mermaid
flowchart TD
    A["Check email for Dinely invitation"] --> B["Click the invitation link"]
    B --> C["Set your own password"]
    C --> D["✅ Your account is active"]
    D --> E["Next shift: Go to Staff Login page"]
    E --> F["Enter email + password"]
    F --> G["✅ You're in the Staff Dashboard"]
```

> **Tip:** Bookmark the Staff Login page on the tablet or device you use at work so you can log in quickly at the start of every shift.

---

## Overview: The Staff Dashboard

When you log in, you land on the Staff Dashboard. Here is what you will see:

```mermaid
graph LR
    Dashboard["🖥️ Staff Dashboard"]

    Dashboard --> A["📋 Reservations List\n\nAll of today's bookings\nGuest name, time, party size\nTable assignment"]
    Dashboard --> B["📅 Calendar View\n\nSee bookings across the week\nSpot busy periods at a glance"]
    Dashboard --> C["🗺️ Live Floor Map\n\nReal-time table occupancy\nColour-coded by status\nClick a table to take action"]
```

---

## Understanding Table Statuses

Every table is always in one of these states. They are colour-coded so you can understand the whole room in seconds.

```mermaid
stateDiagram-v2
    [*] --> Available: Table is empty and ready

    Available --> Reserved: Customer books online
    Reserved --> Seated: Guest arrives, you check them in
    Seated --> Completed: Guest leaves, you clear the table
    Completed --> Available: Table reset and ready for next guest

    Available --> Seated: Walk-in guest is seated directly
```

| Status | What it Means | Who Changes It |
|---|---|---|
| **Available** 🟢 | Empty table, ready for guests | Automatic when cleared |
| **Reserved** 🟡 | An online booking is coming | Automatic when booking is made |
| **Seated** 🔵 | Guests are currently at the table | You do this when guest arrives |
| **Completed** ✅ | Guests have left, table being reset | You do this when guests leave |

---

## Your Daily Workflow: Start of Shift

Before service begins, take a moment to review the dashboard.

```mermaid
flowchart TD
    A["Log in to Staff Dashboard"] --> B["Check the Reservations List"]
    B --> C{"Any bookings for today?"}
    C -->|"Yes"| D["Note the times, party sizes, and table numbers"]
    C -->|"No bookings yet"| E["Keep an eye on the list — bookings appear instantly"]
    D --> F["Check the Live Floor Map"]
    F --> G["Confirm layout matches the physical room"]
    G --> H["✅ Ready for service"]
```

---

## Checking In a Guest (A Guest Has Arrived)

This is the most common action you will perform during a shift.

```mermaid
sequenceDiagram
    actor Guest as Guest Arrives
    actor You as You (Staff)
    participant Dashboard as Staff Dashboard
    participant System as Dinely

    Guest->>You: Arrives at the restaurant
    You->>Dashboard: Find their name in the Reservations List
    You->>Dashboard: Click on the reservation
    You->>Dashboard: Click "Mark as Seated"
    Dashboard->>System: Table status updated to Seated
    System-->>Dashboard: 🔵 Table shows as Occupied on the Floor Map
    Note over System: Table is now locked — no one else can be booked here
    You->>Guest: Show them to their table
```

**On the floor map**, the table will immediately change from **yellow (Reserved)** to **blue (Seated)**, giving you and any other staff member an instant visual confirmation.

---

## Clearing a Table (Guests Have Left)

When a table of guests finishes their meal and leaves, you need to clear the table in the system so it becomes available for the next booking.

```mermaid
sequenceDiagram
    actor You as You (Staff)
    participant Dashboard as Staff Dashboard
    participant System as Dinely

    You->>Dashboard: Go to the Live Floor Map
    You->>Dashboard: Click on the occupied table (shown in Blue / Red)
    You->>Dashboard: Click "Clear Table" or "Complete"
    Dashboard->>System: Table status updated to Available
    System-->>Dashboard: 🟢 Table shows as Available on the Floor Map
    Note over System: Table is immediately open for online bookings again
```

> **Why this matters:** As soon as you clear a table, customers on your website can book it for the next available slot. If you forget to clear a table, you may lose potential bookings.

---

## Handling Walk-In Guests

Sometimes guests arrive without a prior booking. Here is how to handle them:

```mermaid
flowchart TD
    A["Walk-in Guest Arrives"] --> B["Check the Live Floor Map"]
    B --> C{Any green (Available) tables?}
    C -->|"Yes"| D["Choose a suitable table based on party size"]
    D --> E["Show the guest to the table"]
    E --> F["Find the table in the Floor Map and click on it"]
    F --> G["Click 'Mark as Seated' or Add Walk-in"]
    G --> H["✅ Table is now locked — no online double-booking"]
    C -->|"No"| I["Apologise and offer a wait time"]
    I --> J["Monitor the map and seat them\nwhen a table becomes Available"]
```

> **Important:** Always mark walk-in guests on the system. If you seat someone without updating the dashboard, Dinely might still offer that table for online booking, causing a double-booking.

---

## Real-Time Updates: What to Expect

The Staff Dashboard updates **automatically without refreshing the page.** Here is what you will see happen in real time:

```mermaid
graph TD
    A["Customer books online"] -->|"Instantly"| B["New booking appears in your Reservations List"]
    A -->|"Instantly"| C["Table changes to yellow on the Floor Map"]

    D["Another staff member seats a guest"] -->|"Instantly"| E["Table changes to blue on your screen"]

    F["Another staff member clears a table"] -->|"Instantly"| G["Table turns green — you see it's free"]

    style A fill:#2d5a3d,color:#ffffff
    style D fill:#1a3a4a,color:#ffffff
    style F fill:#1a3a4a,color:#ffffff
```

You do not need to do anything for these updates — they just happen.

---

## End of Shift Checklist

Before you hand over or log out, run through this:

```mermaid
flowchart TD
    A["End of Shift"] --> B{Any tables still marked as Seated?}
    B -->|"Yes — guests are still there"| C["Leave them as Seated\nfor the next shift to handle"]
    B -->|"No — everyone has gone"| D["Mark all remaining tables as Clear"]
    D --> E{Any unusual bookings\nor issues to report?}
    E -->|"Yes"| F["Note them for the manager"]
    E -->|"No"| G["✅ Log out of the Staff Dashboard"]
```

---

## Quick Reference: What Each Button Does

| Button | When to Use It | What Happens |
|---|---|---|
| **Mark as Seated** | Guest arrives for their booking | Table turns blue, locked as occupied |
| **Clear Table** | Guests have left and table is reset | Table turns green, available for new bookings |
| **Add Walk-in** | Unplanned guest arrives | Creates a quick manual booking and marks table |
| **Calendar View** | Planning ahead for busy nights | Shows all bookings laid out by time and day |

---

## Troubleshooting: Common Questions

**Q: A booking appeared on my screen but I can't see the table on the floor map.**
→ The admin may not have assigned that booking to a specific table. Check the Reservations List for the table number.

**Q: I accidentally cleared a table but the guests are still there.**
→ Find the table on the floor map or reservations list and mark it as Seated again.

**Q: The dashboard seems slow or isn't updating.**
→ Refresh your browser page. If the issue continues, check your internet connection.

**Q: A guest says they have a booking, but I can't find it.**
→ Search by their last name in the Reservations List. If it still doesn't appear, ask your manager to check the admin panel.

---

*For system setup and configuration, see the **Admin Guide**. For the full platform overview, see the **Client Overview**.*
