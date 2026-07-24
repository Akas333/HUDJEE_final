import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ingestRouter } from './routes/ingest'
import { notificationsRouter } from './routes/notifications'

type Env = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  FCM_SERVER_KEY: string
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors())

app.get('/', (c) => {
  return c.text('HUDJEE Edge API is running! 🚀')
})

app.route('/ingest', ingestRouter)
app.route('/internal', notificationsRouter)

export default app
