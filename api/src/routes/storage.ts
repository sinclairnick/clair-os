import { Hono } from "hono"
import { auth } from "../auth.js"
import { uploadFile } from "../lib/storage.js"

export const storageRouter = new Hono()

storageRouter.post("/upload", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) {
        return c.json({ error: "Unauthorized" }, 401)
    }

    const body = await c.req.parseBody()
    const file = body["file"]

    if (!file || !(file instanceof File)) {
        return c.json({ error: "No file uploaded" }, 400)
    }

    try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const url = await uploadFile(buffer, file.name, file.type)
        return c.json({ url })
    } catch (error) {
        console.error("Upload error:", error)
        return c.json({ error: "Upload failed" }, 500)
    }
})
