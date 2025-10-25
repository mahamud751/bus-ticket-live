import io from "socket.io-client";

console.log("Importing socket.io-client");

class SocketManager {
  private static instance: SocketManager;
  private socket: ReturnType<typeof io> | null = null;
  private listeners: Map<string, Array<(...args: unknown[]) => void>> =
    new Map();
  private connectionAttempts: number = 0;
  private maxRetries: number = 5;
  private userId: string | null = null;
  private isConnecting: boolean = false;
  private isConnectedFlag: boolean = false;

  private constructor() {
    console.log("Creating new SocketManager instance");
  }

  public static getInstance(): SocketManager {
    console.log("Getting SocketManager instance");
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  public connect(userId: string) {
    console.log("SocketManager.connect called with userId:", userId);

    // If already connected with the same user, do nothing
    if (this.isConnectedFlag && this.userId === userId) {
      console.log("Socket already connected with same user, skipping");
      return;
    }

    this.userId = userId;

    // Always allow reconnection
    console.log("Initializing socket connection");

    try {
      // If socket exists but is disconnected, reconnect
      if (this.socket) {
        if (this.socket.connected) {
          console.log("Socket already connected");
          // Still join the user room and request presence
          this.socket.emit("join-user", userId);
          this.socket.emit("request-presence");
          return;
        } else {
          console.log("Socket disconnected, reconnecting");
          this.socket.connect();
          return;
        }
      }

      console.log("Initializing new socket connection");
      this.socket = io({
        path: "/api/socketio",
      });

      this.socket.on("connect", () => {
        console.log("Socket connected successfully, ID:", this.socket?.id);
        this.connectionAttempts = 0;
        this.isConnectedFlag = true;
        // Join user room
        if (this.userId && this.socket) {
          this.socket.emit("join-user", this.userId);
          // Request presence state
          this.socket.emit("request-presence");
        }
      });

      this.socket.on("connect_error", (error: unknown) => {
        console.error("Socket connection error:", error);
        this.isConnectedFlag = false;
        this.handleReconnect();
      });

      this.socket.on("disconnect", (reason: string) => {
        console.log("Socket disconnected:", reason);
        this.isConnectedFlag = false;
        if (reason === "io server disconnect") {
          // Server disconnected, don't reconnect
          console.log("Server disconnected, not reconnecting");
        } else {
          // Client disconnected, try to reconnect
          this.handleReconnect();
        }
      });

      // Set up event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error("Error initializing socket:", error);
      this.isConnectedFlag = false;
      this.handleReconnect();
    }
  }

  private handleReconnect() {
    console.log(
      "Handling reconnection, attempt:",
      this.connectionAttempts,
      "max:",
      this.maxRetries
    );
    if (this.connectionAttempts < this.maxRetries) {
      this.connectionAttempts++;
      console.log(
        `Reconnection attempt ${this.connectionAttempts}/${this.maxRetries}`
      );
      setTimeout(() => {
        if (this.socket) {
          this.socket.connect();
        } else if (this.userId) {
          this.connect(this.userId);
        }
      }, Math.min(1000 * 2 ** this.connectionAttempts, 10000)); // Exponential backoff
    } else {
      console.error("Max reconnection attempts reached");
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    console.log("Setting up socket event listeners");
    // Forward all events to registered listeners
    // @ts-expect-error: onAny exists in socket.io-client but not in the types
    this.socket.onAny((event: string, ...args: unknown[]) => {
      console.log(`Socket event received: ${event}`, args);
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.forEach((listener) => {
          try {
            console.log(`Calling listener for event: ${event}`);
            listener(...args);
          } catch (error) {
            console.error(`Error in listener for event ${event}:`, error);
          }
        });
      }
    });
  }

  public on(event: string, listener: (...args: unknown[]) => void) {
    console.log("Registering listener for event:", event);
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);

    // If socket is already connected, emit any buffered events
    if (this.socket && this.socket.connected) {
      // For presence events, we might want to re-request state
      if (event === "presence-state") {
        this.socket.emit("request-presence");
      }
    }
  }

  public off(event: string, listener?: (...args: unknown[]) => void) {
    console.log("Removing listener for event:", event);
    if (!listener) {
      // Remove all listeners for this event
      this.listeners.delete(event);
    } else {
      // Remove specific listener
      const listeners = this.listeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    }
  }

  public emit(event: string, data?: unknown) {
    console.log("SocketManager.emit called with event:", event, "data:", data);
    console.log("Socket connection status:", this.isConnected());
    console.log("Socket ID:", this.getSocketId());
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(
        "Socket not connected, cannot emit event:",
        event,
        "Data:",
        data
      );
      // Try to reconnect if not connected
      if (this.userId) {
        this.connect(this.userId);
        // Try to emit again after a short delay
        setTimeout(() => {
          if (this.socket && this.socket.connected) {
            this.socket.emit(event, data);
          }
        }, 1000);
      }
    }
  }

  public disconnect() {
    console.log("Disconnecting socket");
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.connectionAttempts = 0;
    this.userId = null;
    this.isConnecting = false;
    this.isConnectedFlag = false;
  }

  public isConnected(): boolean {
    const connected = this.socket && this.socket.connected;
    console.log("Socket connection status:", connected);
    return !!connected;
  }

  public getSocketId(): string | null {
    const id = this.socket ? this.socket.id : null;
    console.log("Socket ID:", id);
    return id;
  }
}

export default SocketManager.getInstance();
