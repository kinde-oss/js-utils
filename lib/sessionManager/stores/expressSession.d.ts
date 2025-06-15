import { Session, SessionData } from 'express-session';

declare module 'express-serve-static-core' {
  interface Request {
    session: Session & Partial<SessionData>;
  }
}
declare module 'express-session' {
  interface SessionData {
    [key: string]: any;
  }
}