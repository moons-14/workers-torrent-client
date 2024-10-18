import { Context } from "hono";

export const getPortNumber = (c: Context) => {
    return c.env.port || 6881;
}