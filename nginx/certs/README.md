# SSL Certificates Directory for SynapseXR

Place your SSL/TLS certificates here for HTTPS deployment:

1. `fullchain.pem` - Your full certificate chain (or cert.pem)
2. `privkey.pem`   - Your private key

### Using Let's Encrypt / Certbot:
If you generated certificates on your Linux server with Certbot:
```bash
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/certs/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/certs/
```

### Self-Signed Certificate (for testing / LAN IP):
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/privkey.pem \
  -out nginx/certs/fullchain.pem \
  -subj "/CN=yourdomain.com"
```
