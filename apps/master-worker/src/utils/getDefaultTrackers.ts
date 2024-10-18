import { Context } from "hono";

export const getDefaultTrackers = (c: Context) => { 
    return c.env["default-trackers"]?.split(",") || [];
};