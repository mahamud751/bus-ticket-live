import { UserRole } from "@prisma/client";

export interface ResourcePermission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface TicketPermissions {
  ticket: ResourcePermission;
  comment: ResourcePermission;
  chat: ResourcePermission;
}

/**
 * Check if a user has permission to perform an action on a ticket
 * @param userRole The role of the user
 * @param action The action to perform (create, read, update, delete)
 * @param resource The resource type (ticket, comment, chat)
 * @param ticketOwnerId The ID of the ticket owner (if applicable)
 * @param userId The ID of the current user
 * @returns boolean indicating if the user has permission
 */
export function hasTicketPermission(
  userRole: UserRole,
  action: keyof ResourcePermission,
  resource: keyof TicketPermissions,
  ticketOwnerId?: string,
  userId?: string
): boolean {
  // Admins have full access to all resources
  if (userRole === UserRole.ADMIN) {
    return true;
  }

  // For customers, check ownership for certain actions
  if (userRole === UserRole.USER) {
    switch (resource) {
      case "ticket":
        // Customers can create tickets
        if (action === "create") {
          return true;
        }
        // For listing tickets (no specific ticket owner), customers can read their own tickets
        if (action === "read" && !ticketOwnerId) {
          return true;
        }
        // Customers can only read, update, delete their own tickets
        if (ticketOwnerId && userId && ticketOwnerId === userId) {
          return (
            action === "read" || action === "update" || action === "delete"
          );
        }
        return false;

      case "comment":
        // Customers can create comments
        if (action === "create") {
          return true;
        }
        // For reading comments, check ownership if specific ticket is provided
        if (action === "read" && !ticketOwnerId) {
          return true;
        }
        // For specific ticket, check ownership
        if (ticketOwnerId && userId && ticketOwnerId === userId) {
          return action === "read";
        }
        return false;

      case "chat":
        // Customers can only chat with admins
        // Check if the user is trying to chat with an admin
        if (userRole === UserRole.USER) {
          // Users can only chat on their own tickets, and messages go to admins
          if (ticketOwnerId && userId && ticketOwnerId === userId) {
            return true;
          }
          return false;
        }
        // For general chat access without specific ticket, allow read
        if (action === "read" && !ticketOwnerId) {
          return true;
        }
        return false;

      default:
        return false;
    }
  }

  // Operators have limited access
  if (userRole === UserRole.OPERATOR) {
    switch (resource) {
      case "ticket":
        // Operators can read all tickets
        if (action === "read") {
          return true;
        }
        return false;

      case "comment":
        // Operators can read all comments and create comments
        if (action === "read" || action === "create") {
          return true;
        }
        return false;

      case "chat":
        // Operators can participate in chats for tickets they manage
        // For now, we'll allow operators to chat on all tickets
        // In a more complex system, you might want to restrict this further
        return true;

      default:
        return false;
    }
  }

  return false;
}

/**
 * Get full permissions object for a user role
 * @param userRole The role of the user
 * @param ticketOwnerId The ID of the ticket owner (if applicable)
 * @param userId The ID of the current user
 * @returns TicketPermissions object with all permissions
 */
export function getTicketPermissions(
  userRole: UserRole,
  ticketOwnerId?: string,
  userId?: string
): TicketPermissions {
  return {
    ticket: {
      create: hasTicketPermission(
        userRole,
        "create",
        "ticket",
        ticketOwnerId,
        userId
      ),
      read: hasTicketPermission(
        userRole,
        "read",
        "ticket",
        ticketOwnerId,
        userId
      ),
      update: hasTicketPermission(
        userRole,
        "update",
        "ticket",
        ticketOwnerId,
        userId
      ),
      delete: hasTicketPermission(
        userRole,
        "delete",
        "ticket",
        ticketOwnerId,
        userId
      ),
    },
    comment: {
      create: hasTicketPermission(
        userRole,
        "create",
        "comment",
        ticketOwnerId,
        userId
      ),
      read: hasTicketPermission(
        userRole,
        "read",
        "comment",
        ticketOwnerId,
        userId
      ),
      update: hasTicketPermission(
        userRole,
        "update",
        "comment",
        ticketOwnerId,
        userId
      ),
      delete: hasTicketPermission(
        userRole,
        "delete",
        "comment",
        ticketOwnerId,
        userId
      ),
    },
    chat: {
      create: hasTicketPermission(
        userRole,
        "create",
        "chat",
        ticketOwnerId,
        userId
      ),
      read: hasTicketPermission(
        userRole,
        "read",
        "chat",
        ticketOwnerId,
        userId
      ),
      update: hasTicketPermission(
        userRole,
        "update",
        "chat",
        ticketOwnerId,
        userId
      ),
      delete: hasTicketPermission(
        userRole,
        "delete",
        "chat",
        ticketOwnerId,
        userId
      ),
    },
  };
}

/**
 * Middleware function to check ticket access
 * @param userRole The role of the user
 * @param ticketOwnerId The ID of the ticket owner
 * @param userId The ID of the current user
 * @throws Error if access is denied
 */
export function checkTicketAccess(
  userRole: UserRole,
  ticketOwnerId: string,
  userId: string
): void {
  if (userRole !== UserRole.ADMIN && ticketOwnerId !== userId) {
    throw new Error(
      "Access denied: You don't have permission to access this ticket"
    );
  }
}

/**
 * Middleware function to check comment access
 * @param userRole The role of the user
 * @param ticketOwnerId The ID of the ticket owner
 * @param userId The ID of the current user
 * @throws Error if access is denied
 */
export function checkCommentAccess(
  userRole: UserRole,
  ticketOwnerId: string,
  userId: string
): void {
  if (userRole !== UserRole.ADMIN && ticketOwnerId !== userId) {
    throw new Error(
      "Access denied: You don't have permission to access comments on this ticket"
    );
  }
}
