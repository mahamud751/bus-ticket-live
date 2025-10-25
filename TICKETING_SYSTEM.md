# Ticketing System Documentation

This document provides an overview of the ticketing system implemented in the Bus Ticket application.

## Features

1. **Authentication & Roles**

   - Token-based authentication
   - Role-based access control (Admin, Customer, Operator)

2. **Ticket Management**

   - Create, view, update, and delete tickets
   - Ticket fields: Subject, Description, Category, Priority, Attachment
   - Ticket status: Open, In Progress, Resolved, Closed
   - Customers see only their own tickets
   - Admins can see all tickets

3. **Comments**

   - Both admins and customers can comment on tickets
   - Comments are tied to specific tickets and users

4. **Real-time Chat**

   - WebSocket-based real-time chat between customers and admins
   - Chat messages are linked to specific tickets
   - Uses Socket.IO for real-time communication

5. **Automated Seeding**
   - Daily cron job to seed new tickets
   - Can be scheduled to run at a specific time each day

## Data Models

### Ticket

- `id`: Unique identifier
- `subject`: Ticket subject/title
- `description`: Detailed description of the issue
- `category`: Ticket category (General, Technical, Billing, Account, Feedback)
- `priority`: Ticket priority (Low, Medium, High, Urgent)
- `status`: Ticket status (Open, In Progress, Resolved, Closed)
- `attachment`: Optional attachment URL
- `userId`: Reference to the user who created the ticket
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### Comment

- `id`: Unique identifier
- `content`: Comment content
- `ticketId`: Reference to the associated ticket
- `userId`: Reference to the user who created the comment
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### Chat

- `id`: Unique identifier
- `content`: Chat message content
- `ticketId`: Reference to the associated ticket
- `userId`: Reference to the user who sent the message
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

## API Endpoints

### Tickets

- `GET /api/tickets` - Get all tickets (with pagination and filtering)
- `POST /api/tickets` - Create a new ticket
- `GET /api/tickets/[id]` - Get a specific ticket
- `PUT /api/tickets/[id]` - Update a ticket
- `DELETE /api/tickets/[id]` - Delete a ticket

### Comments

- `GET /api/tickets/[id]/comments` - Get all comments for a ticket
- `POST /api/tickets/[id]/comments` - Add a comment to a ticket

### Chat

- `GET /api/tickets/[id]/chat` - Get all chat messages for a ticket
- `POST /api/tickets/[id]/chat` - Send a chat message for a ticket

## Role-Based Access Control

### Admin

- Full access to all tickets, comments, and chat messages
- Can change ticket status
- Can view all tickets regardless of ownership

### Customer

- Can create tickets
- Can only view, update, and delete their own tickets
- Can comment on their own tickets
- Can participate in chat for their own tickets

### Operator

- Can view all tickets
- Can create comments on any ticket
- Can participate in chat for any ticket

## Real-time Chat Implementation

The real-time chat uses Socket.IO for WebSocket communication:

1. Users join ticket-specific chat rooms
2. Messages are broadcast to all users in the room
3. Frontend uses the `useTicketChat` hook to manage chat state

## Cron Job for Daily Ticket Seeding

A daily cron job can be set up to automatically seed new tickets:

1. Script: `scripts/daily-ticket-seed.ts`
2. NPM command: `npm run db:seed:tickets:daily`
3. Creates 5-10 random tickets each day with varying categories, priorities, and statuses

## Frontend Components

### Pages

- `/tickets` - List of tickets
- `/tickets/[id]` - Ticket detail view
- `/tickets/new` - Create new ticket form

### Hooks

- `useTicketChat` - Manages real-time chat functionality

## Setup and Deployment

### Database Migration

After implementing the ticketing system, run:

```bash
npx prisma migrate dev --name add_ticketing_system
```

### Seeding

To seed the initial data:

```bash
npm run db:seed
```

### Daily Ticket Seeding Cron Job

To set up the daily ticket seeding cron job, see `scripts/cron-setup.md`.

## Testing

The ticketing system includes:

- API route tests
- Access control validation
- Real-time chat functionality testing

Run tests with:

```bash
npm run test
```
