import "express-session";

declare module "express-session" {
    interface SessionData {
        [key: string]: unknown;
    }
}