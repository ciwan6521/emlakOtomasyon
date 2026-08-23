# UltaHost — pointstepup.com kurulumu

Diğer projelere dokunmamak için REOS sadece **127.0.0.1** üzerinde port dinler. Dış dünya **nginx** üzerinden gelir.

## Mimari

| Domain | Hedef | Host port (localhost) |
|--------|--------|------------------------|
| `pointstepup.com` | Web (Next.js) | 3010 (veya boş bulunan) |
| `api.pointstepup.com` | API + WebSocket | 4010 |
| `media.pointstepup.com` | MinIO (görseller) | 9010 |

Postgres, Redis ve MinIO iç ağda kalır — host’ta 5432/6379 açılmaz.

---

## Adım 1 — DNS (UltaHost / domain panel)

A kayıtları sunucu IP’sine:

- `pointstepup.com`
- `www.pointstepup.com`
- `api.pointstepup.com`
- `media.pointstepup.com`

---

## Adım 2 — SSH ile sunucuya bağlan

```bash
ssh root@SUNUCU_IP
# veya
ssh kullanici@SUNUCU_IP
```

---

## Adım 3 — Boş portları kontrol et

```bash
cd /var/www   # veya projelerinin olduğu klasör
git clone https://github.com/ciwan6521/emlakOtomasyon.git pointstepup
cd pointstepup
chmod +x deploy/ultahost/*.sh
bash deploy/ultahost/find-ports.sh
```

Çıktıda **FREE** olan portları not al. Varsayılanlar genelde uygundur: `3010`, `4010`, `9010`.

Mevcut projeleri görmek için:

```bash
ss -tln | grep LISTEN
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

REOS container isimleri `reos-*` ile başlar; diğer projelerle karışmaz.

---

## Adım 4 — Ortam dosyası

```bash
cp deploy/ultahost/pointstepup.env .env.production
nano .env.production
```

Mutlaka değiştir:

- `POSTGRES_PASSWORD`
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` → `openssl rand -base64 48`
- `S3_ACCESS_KEY` / `S3_SECRET_KEY` (MinIO)
- `WEB_HOST_PORT`, `API_HOST_PORT`, `MINIO_HOST_PORT` (Adım 3’teki portlar)

İlk kurulumda `RUN_SEED=true`, demo kullanıcılar yüklendikten sonra `false` yap.

---

## Adım 5 — Docker build & start

```bash
bash deploy/ultahost/deploy.sh
```

Veya manuel:

```bash
export WEB_HOST_PORT=3010 API_HOST_PORT=4010 MINIO_HOST_PORT=9010
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

Kontrol:

```bash
curl http://127.0.0.1:4010/api/v1/health
curl -I http://127.0.0.1:3010/login
docker compose -f docker-compose.prod.yml ps
```

---

## Adım 6 — Nginx (diğer sitelere dokunmadan yeni site)

```bash
sed -e "s/__WEB_PORT__/3010/" \
    -e "s/__API_PORT__/4010/" \
    -e "s/__MINIO_PORT__/9010/" \
    deploy/ultahost/nginx-pointstepup.conf | sudo tee /etc/nginx/sites-available/pointstepup

sudo ln -sf /etc/nginx/sites-available/pointstepup /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Portları Adım 3’teki değerlerle değiştir.

---

## Adım 7 — SSL (Let’s Encrypt)

```bash
sudo certbot --nginx \
  -d pointstepup.com -d www.pointstepup.com \
  -d api.pointstepup.com -d media.pointstepup.com
```

---

## Adım 8 — Tarayıcı test

- https://pointstepup.com/login  
- Giriş: `owner@adriatic.me` / `Passw0rd!` (seed sonrası — şifreyi değiştir)

---

## Güncelleme

```bash
cd /var/www/pointstepup
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

---

## Sorun giderme

| Sorun | Çözüm |
|-------|--------|
| Port meşgul | `find-ports.sh` ile başka port seç, `.env.production` güncelle |
| 502 Bad Gateway | `docker compose ps` — api/web ayakta mı? |
| CORS hatası | `API_CORS_ORIGINS` = `https://pointstepup.com` |
| Görseller açılmıyor | `media.pointstepup.com` DNS + nginx + `S3_PUBLIC_URL` |

Loglar: `docker compose -f docker-compose.prod.yml logs -f api web`
