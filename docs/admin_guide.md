# Dinely — Admin Guide

**Who is this guide for?** This guide is for the restaurant owner or manager — the person who sets up the system and is responsible for the overall configuration. You do not need any technical knowledge to follow this guide.

---

## Your Role as Admin

As an Admin, you are the person in charge. You control everything — from how the tables are laid out to who on your team gets access. Think of this guide as your checklist for getting started and keeping things running smoothly.

```mermaid
graph TD
    A["Admin"] --> B["1. Set Up Restaurant Profile"]
    A --> C["2. Create Tables"]
    A --> D["3. Design Floor Map"]
    A --> E["4. Invite Staff"]
    A --> F["5. Share Booking Link"]
    A --> G["6. Monitor Reservations"]
```

---

## Step 1: Logging In

You will receive your login credentials from your Dinely setup. Visit the admin login page and sign in with your email and password.

```mermaid
flowchart TD
    A["Visit Admin Login Page"] --> B["Enter Email and Password"]
    B --> C{Correct Credentials?}
    C -->|Yes| D["Access Admin Dashboard"]
    C -->|No| E["Error shown - Check your credentials"]
    E --> B
```

Once logged in, you land on the **Admin Dashboard** — your central control panel.

---

## Step 2: Creating Your Tables

Before anything can be booked, you need to tell Dinely what tables your restaurant has.

Navigate to **Tables Management** in your dashboard.

```mermaid
flowchart LR
    A["Tables Management Tab"] --> B["Click Add Table"]
    B --> C["Enter Table Name"]
    C --> D["Set Capacity"]
    D --> E["Set Location"]
    E --> F["Save Table"]
    F --> G{"More Tables to Add?"}
    G -->|Yes| B
    G -->|No| H["All Tables Created"]
```

**Tips for naming tables:**
- Use names your staff will immediately recognise, like **"Window Seat 1"** or **"Private Room A"**.
- The table name is also shown to customers when they choose their table online, so keep it friendly.
- Group tables by location so staff can quickly filter them on the live dashboard.

---

## Step 3: Designing the Floor Map

Once your tables are created, go to the **Floor Map** tab. This is where you arrange the tables to visually match your actual restaurant layout.

```mermaid
flowchart TD
    A["Open Floor Map Tab"] --> B["Tables appear as blocks on a canvas"]
    B --> C["Drag each table to its real-world position"]
    C --> D["Position and size tables to match your physical dining room"]
    D --> E["Click Save Floor Plan"]
    E --> F["Staff can now see a real-time visual map of your dining room"]
```

**Why this matters:**
- Your staff's **Live View** mirrors this exact layout. When a table is booked, it changes colour on the map.
- Managers visiting the dashboard can instantly see which section of the restaurant is busy.

| Table Colour on Staff Map | Meaning |
|---|---|
| Green | Available — ready for guests |
| Amber | Reserved — a booking is coming |
| Red | Seated — guests are currently at the table |

---

## Step 4: Inviting Your Staff

Your team needs their own logins to access the Staff Dashboard. You send them invitations — they never need to share your admin credentials.

```mermaid
sequenceDiagram
    participant Admin as Admin
    participant Dashboard as Admin Dashboard
    participant Email as Email Service
    participant Staff as Staff Member

    Admin->>Dashboard: Goes to Staff Management tab
    Admin->>Dashboard: Clicks Invite Staff Member
    Admin->>Dashboard: Enters staff member email address
    Dashboard->>Email: Sends invitation email to staff member
    Email->>Staff: Staff receives invitation link
    Staff->>Dashboard: Clicks link and sets their own password
    Staff->>Dashboard: Staff can now log in independently
```

**Managing your team:**
- You can see all invited staff members and whether they have accepted.
- If someone leaves your team, you can revoke their access instantly.
- Staff can only see their dashboard — they cannot change your table setup or invite others.

---

## Step 5: Sharing Your Booking Link

Once everything is set up, you are ready to accept bookings. Your unique booking link is the gateway for all online reservations.

```mermaid
flowchart TD
    A["Copy Your Booking Link from Admin Dashboard"] --> B{"Where do you want to use it?"}
    B --> C["Your Website Book a Table button"]
    B --> D["Instagram bio link"]
    B --> E["Google Business Profile"]
    B --> F["Email newsletter"]
    C --> G["Customer clicks the link"]
    D --> G
    E --> G
    F --> G
    G --> H["Opens Dinely Booking Wizard"]
    H --> I["Customer completes booking"]
    I --> J["Returned to your website when done"]
```

**Customising the link:**
```
Base link:
https://dinely.com/book-a-table?restaurant=your-restaurant-name

With return destination (sends customer back to your site after booking):
https://dinely.com/book-a-table?restaurant=your-restaurant-name&return_url=https://yourwebsite.com
```

---

## Step 6: Monitoring Reservations

The **Reservations** tab in your Admin Dashboard gives you a full historical and future view of all bookings.

```mermaid
graph TD
    A["Reservations Tab"] --> B["Filter by Date"]
    A --> C["Filter by Status"]
    A --> D["Search by Guest Name"]

    C --> E["Confirmed - Booking is scheduled"]
    C --> F["Seated - Guest is at the table"]
    C --> G["Completed - Guest has left"]
    C --> H["Cancelled - Booking was cancelled"]
```

You can also **manually add a reservation** here. If a guest calls to book by phone, you enter their details directly and the table is blocked just as if they had booked online.

---

## Admin Dashboard at a Glance

```mermaid
graph TD
    Dashboard["Admin Dashboard"]

    Dashboard --> Tab1["Reservations - View all bookings, filter by date and status, add manual bookings"]
    Dashboard --> Tab2["Floor Map - Drag and drop table layout, visual dining room designer"]
    Dashboard --> Tab3["Tables Management - Create and edit tables, set capacity and location"]
    Dashboard --> Tab4["Staff Management - Invite team members, revoke access, view active staff"]
    Dashboard --> Tab5["Settings - Restaurant profile, booking preferences, operating hours"]
```

---

## Troubleshooting: Common Admin Questions

**Q: A table is showing as available but it shouldn't be.**
→ Log into the Staff Dashboard, find the reservation, and manually mark the table as "Seated".

**Q: A staff member can't log in.**
→ Go to Staff Management and resend or cancel and re-invite them.

**Q: I want to stop taking online bookings temporarily.**
→ You can deactivate a table in Tables Management to remove it from the online booking options.

**Q: Can I change the floor map after we rearrange the restaurant?**
→ Yes, absolutely. Go to the Floor Map tab and reposition your tables at any time.

---

*For daily operations guidance for your team, see the **Staff Guide**.*
