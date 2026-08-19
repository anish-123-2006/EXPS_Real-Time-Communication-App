# Meshly server

## Run locally

1. Copy `.env.example` to `.env` and provide a PostgreSQL `DATABASE_URL` and a long random `JWT_SECRET`.
2. Run `npm install`, then `npm run db:deploy` and `npm run build`.
3. Run `npm run dev`.

For deployment, set `DATABASE_URL`, `JWT_SECRET`, `PORT`, and `CLIENT_ORIGIN`. `CLIENT_ORIGIN` can be a comma-separated list of permitted frontend origins. Run `npm run db:deploy` as the release step, `npm run build` as the build step, and `npm start` as the start command.

The included initial migration is for a new database. If this project is already using an existing database with these tables, baseline it with Prisma before running the release migration command.
