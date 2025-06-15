import "express-session";

declare module "express-session" {
    interface SessionData {
        [key: string]: any; // Allow any key-value pairs in session data
    }
}