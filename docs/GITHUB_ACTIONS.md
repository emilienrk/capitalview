# 🚀 Deployment with GitHub Actions

## Setup

### 1. GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | VPS IP address |
| `VPS_USER` | SSH Username |
| `VPS_SSH_KEY` | Private SSH Key |
| `VPS_PORT` | SSH Port (default: 22) |
| `SOPS_AGE_KEY` | Private key for SOPS decryption |
| `VITE_API_URL` | Production API URL |

### 2. VPS Initial Setup

```bash
# Clone project
git clone https://github.com/your-username/capitalview.git
cd capitalview

# Initial .env setup (at root)
cp backend/.env.example .env
nano .env

# Start services
docker-compose -f docker-compose.prod.yaml up -d
```

## 🔄 Deployment Workflow

### Automatic
Triggered on every **push to `main`**.

### Manual
1. Go to **Actions → Deploy to VPS**.
2. Click **Run workflow**.

## 📊 Monitoring

- **GitHub Actions**: Real-time deployment logs.
- **VPS Status**:
  ```bash
  docker-compose -f docker-compose.prod.yaml ps
  docker-compose -f docker-compose.prod.yaml logs -f
  ```

## 🔐 Security

The `.env` file must be managed securely. Using **SOPS** allows you to commit an encrypted `.env.prod.enc` to the repository. The GitHub Action will decrypt it during deployment using the `SOPS_AGE_KEY`.