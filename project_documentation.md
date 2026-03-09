# Law Firm Lead Tracker - Project Documentation

## 1. Project Overview
**Law Firm Lead Tracker** is a comprehensive web application built to streamline operations for law firms. It focuses on efficiently managing interactions, tracking lead progress, capturing client details, and facilitating role-based workflows between administrators and lawyers. Built with a modern technology stack, it provides an intuitive interface and robust database backend.

## 2. Technology Stack
*   **Frontend**: Next.js (App Router), React, Tailwind CSS
*   **Icons**: Lucide React
*   **Backend / Database**: Supabase (PostgreSQL, Authentication)
*   **Deployment Target**: Vercel (recommended) / Android (Capacitor)

## 3. Database Schema
The system relies on a PostgreSQL database managed by Supabase, enforcing Row Level Security (RLS) for data protection. The core tables are:
*   **`profiles`**: Extends Supabase auth system. Stores user information, roles (`admin`, `lawyer`), and metrics like total leads managing.
*   **`leads`**: Stores client information (name, phone), assignment to a specific lawyer, current case status, case summary, next follow-up dates, and boolean flags for confirmation.
*   **`payments`**: Linked to specific leads to track financial details, including total payment, advance payment, and remarks.

## 4. User Roles and Access Control
The application operates on a strict Role-Based Access Control (RBAC) model implemented through Supabase RLS policies:
*   **Admin**: Full access. Can view all leads, manage all lawyers, assign leads, and access overarching system statistics.
*   **Lawyer**: Restricted access. Can only view and manage leads specifically assigned to their profile. Can register new leads under their own profile and create payments for confirmed leads.

## 5. Main Application Features & Pages

### 5.1 Admin Module (`/admin/*`)
The administrative section provides a bird's-eye view and deep control over the firm's operations.

*   **Dashboard (`/admin`)**:
    *   **Function**: A statistical overview of the firm's performance.
    *   **Features**: Displays metrics like total lawyers, total leads in the system, and recent confirmed cases. Uses visual trend indicators.
*   **Lead Management (`/admin/leads`)**:
    *   **Function**: Centralized control over all prospective clients.
    *   **Features**: Add new leads via a modal form, search and filter existing leads, assign leads to specific lawyers, and monitor their status (e.g., New, Contacted, In Progress).
*   **Lawyer Management (`/admin/lawyers`)**:
    *   **Function**: Administration of staff accounts.
    *   **Features**: Securely create new lawyer accounts via API integration, edit existing lawyer details, and track their individual performance metrics.
*   **Confirmed Cases (`/admin/confirmed`)**:
    *   **Function**: A dedicated view for successfully converted leads.
    *   **Features**: Displays detailed payment information, case summaries, and allows administrators to track financial conversions.

### 5.2 Lawyer Module (`/lawyer/*`)
A focused workspace for individual lawyers to manage their portfolio of clients.

*   **Lawyer Dashboard (`/lawyer`)**:
    *   **Function**: The primary interface for lawyers to interact with their assigned cases.
    *   **Features**:
        *   **Task List**: View assigned leads and their current status.
        *   **Lead Creation**: Manual entry of new leads discovered independently.
        *   **Interaction Tracking**: Log follow-ups, update case modes, and record interaction history.
        *   **Status Management**: Progress cases through stages (New -> Contacted -> In Progress -> Confirmed -> Lost).
        *   **Payment Capture**: Securely record payment details when a lead reaches the 'Confirmed' status.

### 5.3 Authentication (`/login`)
*   **Function**: Secure entry point for all users.
*   **Features**: Integrates with Supabase Auth to route users to either the Admin or Lawyer dashboard based on their profile role.

## 6. API Integrations
*   **Account Creation (`/api/admin/create-lawyer`)**: A secure server-side route used by administrators to bypass client-side limitations and create new user authentication records in Supabase, associating them directly with the `lawyer` role.
*   **Account Modification (`/api/admin/edit-lawyer`)**: Secure route to update lawyer profile configurations.

## 7. Next Steps & Extensibility
The modular nature of the Next.js App Router and Supabase backend allows for straightforward feature expansion, such as:
*   Integration with Meta Lead Ads via Webhooks (currently in implementation strategy).
*   Enhanced reporting and data export capabilities.
*   Integration with external calendar applications for follow-up scheduling.
