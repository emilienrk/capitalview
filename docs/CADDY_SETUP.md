# 🌐 Caddy Configuration for Production

## Simplified Architecture

Caddy on your VPS acts as a reverse proxy, handling HTTPS and routing:

```
Internet
   ↓
Caddy (VPS) → Auto HTTPS, Rate limiting, Routing
   ↓
   ├─→ Frontend (localhost:5173)
   └─→ Backend (localhost:8000)
```

## Setup on VPS

### 1. Configure Caddy

```bash
# On VPS
sudo nano /etc/caddy/Caddyfile
```

### 2. Reload Caddy

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## DNS Configuration

```
Type    Name                            Value
A       capitalview.fr   <VPS_IP>
A       api.capitalview.fr <VPS_IP>
```

## Benefits

- ✅ **Automatic HTTPS**: Caddy manages Let's Encrypt certificates.
- ✅ **Auto-Renewal**: Certificates are renewed automatically.
- ✅ **Security**: Containers are not exposed directly to the internet.
- ✅ **Performance**: High-performance reverse proxy.

## Firewall

Ensure these ports are open:
- `80/tcp` (HTTP)
- `443/tcp` (HTTPS)
- `22/tcp` (SSH)
