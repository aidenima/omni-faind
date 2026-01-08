# Quick Deploy Instructions

## Prvi put na serveru

```bash
# 1. Kloniraj projekat
cd /var/www
git clone <repo-url> omnifaind
cd omnifaind

# 2. Instaliraj dependencies
npm install

# 3. Kopiraj env template i popuni ga
cp env.template .env
nano .env

# 4. Generiši Prisma client
npx prisma generate

# 5. Pokreni migracije
npx prisma migrate deploy

# 6. Build
npm run build

# 7. Pokreni sa PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # za auto-start na boot

# 8. Setup nginx
sudo cp nginx-omnifaind.conf /etc/nginx/sites-available/omnifaind
sudo ln -s /etc/nginx/sites-available/omnifaind /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Svaki sledeći deploy

```bash
# Samo pokreni deploy skriptu
/var/www/omnifaind/deploy.sh
```

Ili ručno:
```bash
cd /var/www/omnifaind &&
nvm use v20 &&
git pull &&
npm install &&
npx prisma generate &&
npm run build &&
pm2 delete omnifaind 2>/dev/null || true &&
pm2 start ecosystem.config.js --env production &&
pm2 save
```

## Environment varijable

Kreiraj `.env` fajl u `/var/www/omnifaind/` koristeći `env.template` kao primer.

**Obavezno popuni:**
- `DATABASE_URL` i `DATABASE_DIRECT_URL`
- `AUTH_SECRET` (minimum 32 karaktera)
- `OPENAI_API_KEY`
- `GOOGLE_API_KEY` i `GOOGLE_CSE_ID`
- `NEXT_PUBLIC_SITE_URL`

## PM2 komande

```bash
pm2 logs omnifaind      # logovi
pm2 status              # status
pm2 restart omnifaind    # restart
pm2 stop omnifaind      # stop
```

## Nginx

Aplikacija ide na portu 3000, nginx proxy-uje na taj port.

SSL certifikate dodaj posle sa Certbot-om.

