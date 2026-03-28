# Dinely — Client Overview

**Welcome to Dinely.** This document is your complete, plain-English guide to understanding what Dinely does, how it works, and how it slots into your restaurant operations. No technical knowledge is needed to read this.

---

## What Is Dinely?

Dinely is a real-time table reservation platform built for restaurants. Think of it as a smart front-desk manager that never sleeps. It handles online bookings from your customers, keeps your staff informed instantly, and ensures no two guests are ever double-booked at the same table.

Your restaurant gets:
- A **booking page** that sits on your own website.
- A **staff dashboard** so your team can see who is coming in, when, and where.
- An **admin dashboard** so the owner or manager can set everything up and manage the whole operation.

---

## The Big Picture

Here is how all the pieces fit together at a glance:

```mermaid
graph TD
    A["Your Restaurant Website"] -->|"Customer clicks Book a Table"| B["Dinely Booking Wizard"]
    B --> C{"Customer Completes Booking"}
    C -->|"Booking Confirmed"| D["Confirmation Email Sent to Customer"]
    C -->|"Instantly"| E["Staff Dashboard Updated in Real-Time"]
    E --> F["Live Floor Map Shows Reserved Table"]
    F --> G{"Guest Arrives"}
    G -->|"Staff checks them in"| H["Table Marked as Seated"]
    H --> I{"Meal Finished"}
    I -->|"Staff clears the table"| J["Table is Free Again"]
    J -->|"Available for next booking"| B
```

The cycle above is continuous throughout your restaurant's operating hours. Every step happens automatically — your team just needs to interact with the dashboard.

---

## Step-by-Step: How a Customer Makes a Booking

This is what your customer experiences from start to finish.

```mermaid
sequenceDiagram
    participant Customer as Customer
    participant YourSite as Your Restaurant Website
    participant Wizard as Dinely Booking Wizard
    participant System as Dinely System
    participant Email as Email Service

    Customer->>YourSite: Visits your website and clicks Book a Table
    YourSite->>Wizard: Opens the Dinely booking page
    Wizard->>Customer: Shows a calendar of available dates
    Customer->>Wizard: Selects a date and time
    Wizard->>System: Checks what tables are free right now
    System-->>Wizard: Returns only available tables
    Wizard->>Customer: Shows available tables to choose from
    Customer->>Wizard: Picks a table
    Customer->>Wizard: Enters name, email, phone and special requests
    Customer->>Wizard: Reviews booking and clicks Confirm
    Wizard->>System: Submits the reservation
    System-->>Email: Sends confirmation email to customer
    System-->>YourSite: Redirects customer back to your website
    Note over System: Table is now locked. No one else can book it.
```

**What the customer sees:**
1. A clean, 4-step form — Date & Time → Choose Table → Your Details → Confirm.
2. A confirmation screen showing their full booking summary.
3. An email in their inbox with all the details.
4. They are automatically sent back to your restaurant's website.

---

## What Happens on Your Side (The Restaurant)

While the customer is booking, here is what happens inside your operation.

```mermaid
sequenceDiagram
    participant Staff as Your Staff
    participant Dashboard as Staff Dashboard
    participant System as Dinely System
    participant Table as Physical Table

    System-->>Dashboard: New reservation appears instantly
    Staff->>Dashboard: Sees the upcoming booking in the list
    Note over Dashboard: Dashboard shows name, time, party size, table number
    Staff->>Table: Guest arrives and Staff greets them
    Staff->>Dashboard: Marks table as Seated
    Dashboard-->>System: Table status updated to Occupied
    Note over System: Table cannot be double-booked now
    Staff->>Dashboard: Guest finishes meal and Staff clears table
    Staff->>Dashboard: Clicks Clear Table
    Dashboard-->>System: Table status updated to Available
    Note over System: Table is open for the next online booking immediately
```

---

## The Three Dashboards Explained

Dinely has three separate areas, each designed for a different person in your team.

```mermaid
graph LR
    A["Admin Dashboard - Owner or Manager"]
    B["Staff Dashboard - Front-of-House Team"]
    C["Booking Wizard - Your Customers"]

    A -->|"Sets up tables and floor plan"| B
    A -->|"Invites staff members"| B
    A -->|"Configures booking link"| C
    C -->|"Sends bookings to"| B
    B -->|"Manages real-time occupancy"| A
```

| Dashboard | Who Uses It | What They Do |
|---|---|---|
| **Admin Dashboard** | Owner / Manager | Sets up restaurant layout, creates tables, invites staff, views all reservations |
| **Staff Dashboard** | Front-of-house team | Sees today's bookings, checks in guests, tracks table occupancy live |
| **Booking Wizard** | Your customers | Makes a reservation in 4 simple steps from your website |

---

## Real-Time Synchronisation: Why It Matters

The most important feature of Dinely is that everything updates **instantly**, across all devices.

```mermaid
graph TD
    A["Customer books Table 5 online at 7pm"] -->|"Within milliseconds"| B["Table 5 disappears from available options"]
    B --> C["Staff Dashboard shows the new booking"]
    C --> D["Floor Map highlights Table 5 as Reserved"]
    D --> E["No other customer or staff member can book Table 5 at 7pm"]
```

This means:
- **No double bookings.** Ever.
- **No phone calls needed** to check availability. The system knows.
- **No manual updates.** When a table is cleared, it's immediately open for new bookings online.

---

## How the Booking Link Works

Your restaurant gets a unique booking link that you can place anywhere on your website (a button, a banner, a link in your social media bio).

**Example Link Format:**
```
https://dinely.com/book-a-table?restaurant=your-restaurant-name
```

You can also tell Dinely where to send the customer after they book:
```
https://dinely.com/book-a-table?restaurant=your-restaurant-name&return_url=https://yourwebsite.com/thank-you
```

When the customer finishes booking, they are automatically sent back to your page — seamlessly, as if the booking was always part of your site.

---

## Summary: Your Restaurant with Dinely

| | Without Dinely | With Dinely |
|---|---|---|
| **Bookings** | Phone calls only | Online 24/7, any device |
| **Records** | Paper reservation book | Digital, always up to date |
| **Double Bookings** | Risk of human error | Impossible — system prevents it |
| **Staff Awareness** | Word of mouth | Live dashboard for all staff |
| **Guest Confirmation** | Manual or none | Automatic email every time |
| **Table Tracking** | Walk around to check | Live colour-coded floor map |

---

*For setup instructions, see the **Admin Guide**. For daily operations, see the **Staff Guide**.*
