# RHEL Server/Runner Setup (Node + Yarn + PM2)

This project’s GitHub Actions workflow can install Node **for the CI job** (via `actions/setup-node`).
That does **not** automatically install Node/PM2 system-wide for interactive SSH sessions.

If you log into the server and see:

- `node: command not found`
- `npm: command not found`
- `yarn: command not found`
- `pm2: command not found`

…then you need a one-time setup on the server.

## One-time install (recommended)

Run as root:

```bash
sudo bash scripts/setup-rhel-node-pm2.sh
```

This will:

- install Node.js 20 (AppStream module `nodejs:20` if available, else NodeSource)
- enable Corepack and activate Yarn Classic 1.22.22
- install `pm2` globally

Verify:

```bash
node -v
npm -v
yarn --version
pm2 --version
```

## PM2 startup (survives reboot)

Run these as the user that should own the PM2 processes (example: `ajdboa`).

```bash
su - ajdboa
cd /path/to/roadmap
pm2 start ecosystem.config.js --update-env
pm2 save
pm2 startup systemd -u ajdboa --hp /home/ajdboa
```

`pm2 startup` prints a `sudo ...` command — run that command as root when prompted.

## Why GitHub Actions “works” but SSH doesn’t

`actions/setup-node` downloads Node into the job environment and puts it on `PATH` **only for that workflow run**.
Your SSH shell uses the system `PATH`, so you won’t see `node/npm/yarn/pm2` unless they are installed on the server.
