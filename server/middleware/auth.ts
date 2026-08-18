import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// We create a custom TypeScript interface so we can safely attach the userId to the request
export interface AuthRequest extends Request {
    userId?: string;
}

export const authenticatetoken = (req: AuthRequest, res: Response, next: NextFunction): any => {
    // 1. Look for the wristband in the request headers
    const authHeader = req.headers['authorization'];
    // The header usually looks like: "Bearer abc123def456..."
    // We split it by the space and grab the second part (the actual token)
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Access denied." })
    }
    try {
        // 2. Verify the wristband using our secret pen
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
        // 3. Attach the user's ID to the request so the next route knows who they are
        req.userId = decoded.userId;
        // 4. Open the velvet rope and let them through to the actual route!
        next();
    } catch (error) {
        // If the token is fake, modified, or expired, reject them
        return res.status(403).json({ error: "invalid or expired token." });
    }

};
