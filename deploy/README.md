# Deploying Pinpoint on Coolify

Two services, both built from this repository with Docker:

| Service | Dockerfile | Port | What it is |
|---|---|---|---|
| `web` | `deploy/web.Dockerfile` | 3000 | The Next.js site (standalone server) |
| `realtime` | `deploy/realtime.Dockerfile` | 4000 | Party Rooms (Socket.IO), health check at `/health` |

Both images run `npm run data` during the build. That generates the flags and the country and map data from `packages/data/raw`, so nothing has to be uploaded by hand.

## Recommended setup: two subdomains

1. **Create a resource:** in Coolify, add a new resource of type **Docker Compose**. Point it at the GitHub repository `prem-25-dev/pindrop`, branch `main`, compose file `docker-compose.yml`.
2. **Set the environment variables** on the resource:
   - `SITE_URL=https://pinpoint.example.com` (your main domain)
   - `REALTIME_URL=https://party.pinpoint.example.com` (the party server's domain)
3. **Set the domains:**
   - service `web`: `https://pinpoint.example.com`, port 3000
   - service `realtime`: `https://party.pinpoint.example.com`, port 4000

   Coolify's proxy (Traefik) issues the HTTPS certificates. WebSockets work through it without extra settings.
4. **Point DNS:** add A records for both names at the server.
5. **Deploy.**

`ORIGINS` on the realtime service is filled from `SITE_URL`. Only your site can open party connections.

### Alternative: one domain

Route `https://pinpoint.example.com/socket.io` to `realtime:4000` with a path rule in Coolify, and leave `REALTIME_URL` empty. The browser then connects to the same origin.

## Good to know

- **Party rooms live in memory.** Restarting or redeploying the realtime service ends the rooms in progress. Players can create a new room straight away. One instance comfortably handles a few hundred rooms.
- **`NEXT_PUBLIC_*` values are build-time.** After changing `SITE_URL` or `REALTIME_URL`, rebuild the `web` service, not just restart it.
- **Health checks:** both images declare one. `web` checks `/robots.txt`, `realtime` checks `/health`.
- **Updating the country data:** run `npm run fetch -w @pinpoint/data` locally (needs network), commit `packages/data/raw`, then redeploy.
- **Not deployed yet:** accounts (Google sign-in plus Postgres) and Umami analytics. They come in a later step and will add a `postgres` service to the compose file.

## Running the containers locally

```sh
docker compose up --build
# site: http://localhost:3000 · party server: http://localhost:4000/health
```

For local development without Docker, `npm run dev` starts both the site (port 3000) and the party server (port 4000).
