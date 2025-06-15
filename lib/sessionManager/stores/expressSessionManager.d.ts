import { Session, SessionData } from "express-session";


declare module "express-session" {
    interface Request {
        session: Session & Partial<SessionData>;
    }
}
