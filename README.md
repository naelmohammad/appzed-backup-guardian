# AppZed Backup Guardian Agent

Verifies backups completed and flags stale targets. Backup jobs report in; a daily 6am cron flags anything without a success in 25 hours. Schema self-initializes. No AI needed.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/naelmohammad/appzed-backup-guardian)

Click **Deploy to Cloudflare**: it clones this repo to your GitHub account, provisions the bindings below on your Cloudflare account, and wires CI/CD with preview URLs on every PR.

## Bindings (auto-provisioned)

```jsonc
{
  "name": "appzed-backup-guardian",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "appzed-backup-guardian-meta"
    }
  ],
  "triggers": {
    "crons": ["0 6 * * *"]
  }
}
```

## Try it

```bash
curl -X POST https://<your-worker>.workers.dev/backups \
  -H 'content-type: application/json' \
  -d '{"target":"postgres-prod","bytes":4294967296,"ok":true}'

curl https://<your-worker>.workers.dev/status
```

GET /health for a liveness check. Managed by AppZed (https://dev.appzed.com/solutions/backup-guardian).
