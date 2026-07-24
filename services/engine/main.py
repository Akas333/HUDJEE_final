from fastapi import FastAPI
import sentry_sdk

# Initialize sentry (dummy DSN for local development)
sentry_sdk.init(dsn="", traces_sample_rate=0.1)

app = FastAPI(title="HUDJEE Adaptive Engine & CPS Worker")

@app.get("/internal/health")
async def health_check():
    return {"status": "ok"}
