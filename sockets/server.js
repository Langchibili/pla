require("dotenv").config();

const { Server } = require("socket.io");
const { io: ioClient } = require("socket.io-client");
const axios = require("axios");

const DEVICE_SERVER_URL = process.env.DEVICE_SOCKET_URL || "http://localhost:3008";
const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:1357").replace(/\/$/, "");
const SOCKET_INTERNAL_TOKEN = process.env.SOCKET_INTERNAL_TOKEN;
const io = new Server({ cors: { origin: "*" } });

io.use((socket, next) => {
    socket.data.isInternalRelay = Boolean(
        SOCKET_INTERNAL_TOKEN &&
        socket.handshake.auth?.internalToken === SOCKET_INTERNAL_TOKEN
    );
    next();
});

function requireInternalRelay(socket, eventName) {
    if (socket.data.isInternalRelay) return true;
    console.warn(`Rejected untrusted '${eventName}' event from socket ${socket.id}`);
    socket.emit("socket_event_error", { message: "Internal relay authentication failed" });
    return false;
}

// Outbound connection to device socket server for push forwarding
const deviceServer = ioClient(DEVICE_SERVER_URL, {
    autoConnect: true,
    reconnection: true,
    auth: SOCKET_INTERNAL_TOKEN ? { internalToken: SOCKET_INTERNAL_TOKEN } : {},
});
deviceServer.on("connect", () => {
    console.log("✅ Main server connected to device server");
    if (!SOCKET_INTERNAL_TOKEN) {
        console.error("SOCKET_INTERNAL_TOKEN is unset; device event forwarding is disabled");
    }
});
deviceServer.on("connect_error", (e) => console.error("Device server connect error:", e.message));

io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on("join_business_room", async (businessId) => {
        const token = socket.handshake.auth?.token;
        if (!businessId || !token) {
            socket.emit("business_room_error", { message: "Authentication and a business ID are required" });
            return;
        }
        try {
            const response = await axios.post(
                `${BACKEND_URL}/api/custom-functions/getMyBusiness`,
                {},
                { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
            );
            if (String(response.data?.business?.id) !== String(businessId)) {
                socket.emit("business_room_error", { message: "You do not have access to this business" });
                return;
            }
            socket.join(`business_${businessId}`);
            console.log(`Socket ${socket.id} joined business_${businessId}`);
            socket.emit("business_room_joined", { businessId });
        } catch (error) {
            socket.emit("business_room_error", { message: "Could not verify business access" });
            console.warn(`Socket ${socket.id} business-room authorization failed: ${error.message}`);
        }
    });

    socket.on("leave_business_room", (businessId) => {
        if (businessId) socket.leave(`business_${businessId}`);
    });

    socket.on("join_employee_room", async (employeeId) => {
        const token = socket.handshake.auth?.token;
        if (!employeeId || !token) {
            socket.emit("employee_room_error", { message: "Authentication and an employee ID are required" });
            return;
        }
        try {
            const response = await axios.get(`${BACKEND_URL}/api/users/me`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 5000,
            });
            if (String(response.data?.id) !== String(employeeId)) {
                socket.emit("employee_room_error", { message: "You do not have access to this employee room" });
                return;
            }
            socket.join(`employee_${employeeId}`);
            socket.emit("employee_room_joined", { employeeId });
        } catch (error) {
            socket.emit("employee_room_error", { message: "Could not verify employee access" });
            console.warn(`Socket ${socket.id} employee-room authorization failed: ${error.message}`);
        }
    });

    // ── Waiter calls ──────────────────────────────────────────────────────
    socket.on("waiter_calls_event", (payload = {}) => {
        if (!requireInternalRelay(socket, "waiter_calls_event")) return;
        const d = payload?.data || {};
        if (d.business_id) {
            io.to(`business_${d.business_id}`).emit("waiter_calls_event", payload);
        }
        // Forward to device server for push notification (background/native)
        deviceServer.emit("waiter_call:new", {
            ownerId: d.owner_id || d.ownerId,
            waiterId: d.assigned_waiter_id || d.waiter_id || d.waiterId,
            waiterIds: d.available_waiter_ids || [],
            payload: d,
            eventType: payload.type,
        });
    });

    // ── Orders ────────────────────────────────────────────────────────────
    socket.on("orders_event", (payload = {}) => {
        if (!requireInternalRelay(socket, "orders_event")) return;
        const d = payload?.data || {};
        if (d.business_id) {
            io.to(`business_${d.business_id}`).emit("orders_event", payload);
        }
        const eventName = payload.type === "create" ? "order:new" : "order:status:updated";
        deviceServer.emit(eventName, {
            ownerId: d.owner_id || d.ownerId,
            waiterId: d.waiter_id || d.waiterId,
            payload: d,
        });
    });

    socket.on("table_status_updated", (payload = {}) => {
        if (!requireInternalRelay(socket, "table_status_updated")) return;
        const d = payload?.data || payload || {};
        if (d.business_id) {
            io.to(`business_${d.business_id}`).emit("table_status_updated", d);
        }
        deviceServer.emit("table:status:updated", {
            ownerId: d.owner_id || d.ownerId,
            waiterId: d.waiter_id || d.waiterId,
            payload: d,
        });
    });

    socket.on("notification:new", (payload = {}) => {
        if (!requireInternalRelay(socket, "notification:new")) return;
        const userId = payload.user_id || payload.userId;
        const businessId = payload.business_id || payload.businessId;
        let target = io;
        if (businessId) target = target.to(`business_${businessId}`);
        if (userId) {
            target = target.to(`employee_${userId}`);
        }
        if (businessId || userId) {
            target.emit("notification:new", payload);
        }
        if (userId) {
            deviceServer.emit("notification:new", { ...payload, userId });
        }
    });

    socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

io.listen(4000);
console.log("Socket server running on port 4000");