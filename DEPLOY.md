# Deployment Guide for OmniFAIND

## Server Setup Instructions

### 1. Prerequisites

- Node.js (v18 or v20 recommended)
- npm or pnpm
- PM2 (`npm install -g pm2`)
- Nginx
- PostgreSQL database
- Python 3 (for CV parsing feature)

### 2. Project Structure

This is a Next.js full-stack application. There is no separate frontend/backend - everything is in one Next.js project.

- **Build output**: `.next/` folder (created after `npm run build`)
- **Production server**: Runs on port 3000 (configurable via PORT env var)
- **API routes**: Located in `app/api/` directory

### 3. Directory Structure on Server

```
/var/www/omnifaind/
├── app/
├── components/
├── lib/
├── prisma/
├── public/
├── ecosystem.config.js
├── deploy.sh
├── package.json
└── .env
```

### 4. Environment Variables

Create a `.env` file in `/var/www/omnifaind/` with the following variables:

```bash
# Database (REQUIRED)
DATABASE_URL="postgresql://user:password@localhost:5432/omnifaind?schema=public"
DATABASE_DIRECT_URL="postgresql://user:password@localhost:5432/omnifaind?schema=public"

# NextAuth / Authentication (REQUIRED)
AUTH_SECRET="your-secret-key-here-minimum-32-characters"
# Alternative: NEXTAUTH_SECRET="your-secret-key-here"

# Google OAuth (OPTIONAL - for Google login)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# OpenAI API (REQUIRED for AI features)
OPENAI_API_KEY="sk-your-openai-api-key-here"

# Google Custom Search API (REQUIRED for search functionality)
GOOGLE_API_KEY="your-google-api-key-here"
GOOGLE_CSE_ID="your-google-custom-search-engine-id-here"

# Site URL (REQUIRED for sitemap, robots, etc.)
NEXT_PUBLIC_SITE_URL="https://omnifaind.com"

# Python binary path (OPTIONAL - for CV parsing)
# PYTHON_BIN="python3"

# Admin coupon token (OPTIONAL - for admin coupon management)
# ADMIN_COUPON_TOKEN="your-secure-admin-token"

# Debug flags (OPTIONAL)
# DEBUG_SEARCH_ERRORS="false"
# DEBUG_SCREENING_ERRORS="false"
# NEXT_PUBLIC_DEBUG_SEARCH_ERRORS="false"
# NEXT_PUBLIC_DEBUG_SCREENING_ERRORS="false"

# Node environment
NODE_ENV="production"

# Port (OPTIONAL - defaults to 3000)
PORT=3000
```

### 5. Initial Setup on Server

```bash
# 1. Clone repository to /var/www/omnifaind
cd /var/www
git clone <your-repo-url> omnifaind
cd omnifaind

# 2. Install dependencies
npm install

# 3. Create .env file (see section 4 above)
nano .env

# 4. Generate Prisma client
npx prisma generate

# 5. Run database migrations
npx prisma migrate deploy

# 6. Build the application
npm run build

# 7. Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save

# 8. Setup PM2 to start on boot
pm2 startup
# Follow the instructions shown
```

### 6. Nginx Configuration

1. Copy the nginx config to nginx sites-available:
```bash
sudo cp /var/www/omnifaind/nginx-omnifaind.conf /etc/nginx/sites-available/omnifaind
```

2. Create symbolic link to sites-enabled:
```bash
sudo ln -s /etc/nginx/sites-available/omnifaind /etc/nginx/sites-enabled/
```

3. Test nginx configuration:
```bash
sudo nginx -t
```

4. Reload nginx:
```bash
sudo systemctl reload nginx
```

5. **After setting up SSL with Certbot**, add these lines to the server block:
```nginx
listen 443 ssl;
ssl_certificate /etc/letsencrypt/live/omnifaind.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/omnifaind.com/privkey.pem;
include /etc/letsencrypt/options-ssl-nginx.conf;
ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
```

And add HTTP to HTTPS redirect:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name omnifaind.com www.omnifaind.com;
    return 301 https://$host$request_uri;
}
```

### 7. Deployment Script

Use the provided `deploy.sh` script for easy deployments:

```bash
# Make script executable
chmod +x /var/www/omnifaind/deploy.sh

# Run deployment
/var/www/omnifaind/deploy.sh
```

Or manually:
```bash
cd /var/www/omnifaind &&
nvm use v20 &&  # or v18, or your Node version
git pull &&
npm install &&
npx prisma generate &&
npm run build &&
pm2 delete omnifaind 2>/dev/null || true &&
pm2 start ecosystem.config.js --env production &&
pm2 save
```

### 8. Useful Commands

```bash
# View PM2 logs
pm2 logs omnifaind

# View PM2 status
pm2 status

# Restart application
pm2 restart omnifaind

# Stop application
pm2 stop omnifaind

# View nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 9. Build Output

After running `npm run build`, Next.js creates:
- `.next/` folder with compiled application
- The application is ready to be served via `npm start` or PM2

### 10. Notes

- The application runs on port 3000 by default (configurable via PORT env var)
- PM2 manages the Node.js process
- Nginx serves as reverse proxy and handles SSL
- All API routes are under `/api/` and are handled by Next.js
- Static files are served by Next.js (from `public/` folder)
- Database migrations should be run after each deployment if there are schema changes

