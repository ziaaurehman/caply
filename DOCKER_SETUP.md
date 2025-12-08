# Docker PostgreSQL Setup Guide

This guide will help you set up a local PostgreSQL database using Docker for development.

## Prerequisites

- Docker and Docker Compose installed on your machine
- You can verify by running: `docker --version` and `docker compose version`

## Quick Start

1. **Start the PostgreSQL container:**
   ```bash
   docker compose up -d
   ```

2. **Verify the container is running:**
   ```bash
   docker ps
   ```
   You should see `caply-postgres` container running.

3. **Check container logs (optional):**
   ```bash
   docker compose logs postgres
   ```

4. **Set up your environment variables:**
   - Copy `env.template` to `.env.local` (if not already done)
   - The `DATABASE_URL` should be set to:
     ```
     DATABASE_URL=postgresql://caply:caply_password@localhost:5432/caply_db
     ```

5. **Run Prisma migrations:**
   ```bash
   npx prisma migrate dev
   ```
   Or if you're using Supabase migrations:
   ```bash
   # Your existing migration commands
   ```

6. **Generate Prisma Client (if needed):**
   ```bash
   npx prisma generate
   ```

## Database Connection Details

- **Host:** localhost
- **Port:** 5432
- **Database:** caply_db
- **Username:** caply
- **Password:** caply_password
- **Connection String:** `postgresql://caply:caply_password@localhost:5432/caply_db`

## Useful Commands

### Stop the database:
```bash
docker compose down
```

### Stop and remove all data (⚠️ This will delete all data):
```bash
docker compose down -v
```

### View database logs:
```bash
docker compose logs -f postgres
```

### Access PostgreSQL CLI:
```bash
docker compose exec postgres psql -U caply -d caply_db
```

### Backup the database:
```bash
docker compose exec postgres pg_dump -U caply caply_db > backup.sql
```

### Restore the database:
```bash
docker compose exec -T postgres psql -U caply caply_db < backup.sql
```

## Troubleshooting

### Port 5432 already in use
If you have PostgreSQL already running on your machine, you can change the port in `docker-compose.yml`:
```yaml
ports:
  - "5433:5432"  # Change 5433 to any available port
```
Then update your `DATABASE_URL` accordingly.

### Container won't start
Check the logs:
```bash
docker compose logs postgres
```

### Reset the database
To completely reset the database:
```bash
docker compose down -v
docker compose up -d
```

## Data Persistence

The database data is stored in a Docker volume named `postgres_data`. This means your data will persist even if you stop the container. To completely remove the data, use `docker compose down -v`.

## Production Note

⚠️ **This setup is for local development only.** For production, use a managed PostgreSQL service like:
- Supabase (which you're already using)
- AWS RDS
- Google Cloud SQL
- Azure Database for PostgreSQL
- DigitalOcean Managed Databases

