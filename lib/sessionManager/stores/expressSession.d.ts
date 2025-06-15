interface KindeSession {
  [key: string]: unknown;
  destroy: (callback: (err?: Error | null) => void) => void;
}

declare module "express-serve-static-core" {
  interface Request {
    session?: KindeSession;
  }
}
