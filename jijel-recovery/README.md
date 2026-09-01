# Jijel Recovery

Community platform for mapping reconstruction needs and coordinating pledges across Jijel province, Algeria.

## Features

- Interactive map with color-coded need markers (`/map`)
- Bilingual damage intake form in Darija and French (`/report`)
- Server actions backed by PostgreSQL + PostGIS

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL (with PostGIS)

On Ubuntu/Debian:

```bash
sudo apt-get install postgresql postgresql-contrib postgresql-16-postgis-3
sudo pg_ctlcluster 16 main start
```

Create the local database:

```bash
sudo -u postgres psql -c "CREATE USER jijel WITH PASSWORD 'jijel_dev' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE jijel_recovery OWNER jijel;"
sudo -u postgres psql -d jijel_recovery -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

### 3. Configure environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Default local URL:

```env
DATABASE_URL="postgresql://jijel:jijel_dev@127.0.0.1:5432/jijel_recovery"
```

In development, if `DATABASE_URL` points to Railway's internal hostname (`postgres.railway.internal`), the app automatically falls back to the local database.

### 4. Migrate and seed

```bash
npm run db:seed
```

This applies the schema and inserts 5 sample needs around Jijel.

### 5. Run the dev server

```bash
npm run dev -- -p 3000 -H 127.0.0.1
```

Open:

- Map: [http://127.0.0.1:3000/map](http://127.0.0.1:3000/map)
- Report form: [http://127.0.0.1:3000/report](http://127.0.0.1:3000/report)

## Production (Railway)

Set `DATABASE_URL` to your Railway PostgreSQL connection string and run migrations before deploying.
