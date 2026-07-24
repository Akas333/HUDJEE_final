import { Hono } from 'hono'

export const ingestRouter = new Hono<{ Bindings: Env }>()

// Interface for Cloudflare Env Bindings
type Env = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

ingestRouter.post('/answer-events', async (c) => {
  try {
    const payload = await c.req.json()
    // The fast path: We directly hit Supabase REST API from the edge
    // to minimize latency for the user when answering a question.
    
    const response = await fetch(`${c.env.SUPABASE_URL}/rest/v1/answer_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': c.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${c.env.SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal' // don't return the inserted row for speed
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const error = await response.text()
      return c.json({ error: "Failed to insert event", details: error }, 500)
    }

    return c.json({ success: true }, 202)
  } catch (error) {
    return c.json({ error: "Invalid request payload" }, 400)
  }
})

ingestRouter.post('/app-open', async (c) => {
  try {
    const payload = await c.req.json()
    
    const response = await fetch(`${c.env.SUPABASE_URL}/rest/v1/app_open_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': c.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${c.env.SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      return c.json({ error: "Failed to log app open" }, 500)
    }

    return c.json({ success: true }, 202)
  } catch (error) {
    return c.json({ error: "Invalid request payload" }, 400)
  }
})
