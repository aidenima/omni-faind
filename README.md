This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database (PostgreSQL)

OmniFAIND now runs on PostgreSQL via Prisma. To initialise a new environment:

1. Create a PostgreSQL database (local `postgres` install, Docker, or a hosted option such as Neon/Supabase) and grab its connection string.
2. Set `DATABASE_URL` inside `.env.local`, for example  
   `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/omnifaind?schema=public"`.
3. Apply the Prisma migrations to create the schema:  
   `pnpm prisma migrate dev --name init-postgres`
4. Regenerate the Prisma client (usually done automatically by the previous step):  
   `pnpm prisma generate`
5. Inspect or edit users with Prisma Studio when needed:  
   `pnpm prisma studio`

### Migrating existing SQLite users (optional)

If you still have `prisma/dev.db` with earlier accounts, you can move them manually:

1. Export the SQLite data:  
   `sqlite3 prisma/dev.db "SELECT id,email,name,authProvider,createdAt,updatedAt FROM User;" > tmp-users.csv`
2. Import the rows into Postgres using your preferred tool (e.g. `psql`, pgAdmin, or a CSV import) targeting the same columns.
3. Once you confirm the data is in Postgres, delete/ignore the old SQLite file.

After the migration, start the app with `pnpm dev` and authentication will read/write directly from PostgreSQL.

## Session security

- Authentication issues device-scoped session tokens backed by the `UserSession` table. Each account keeps up to 3 active devices; the oldest is revoked automatically when a new login exceeds the limit.
- Run the migration to add the table: `pnpm prisma migrate dev --name add-user-sessions` (regenerates Prisma client).
- After deploying, users should re-login to obtain a device session token.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## PDF parsing support

The screening workspace relies on a lightweight Python helper to read PDF CVs via **PyPDF2**.  
Before running the app locally, make sure you have Python 3 installed and then:

```bash
pip install -r requirements.txt
```

If `python` is not available on your PATH, set the `PYTHON_BIN` environment variable to the appropriate executable before starting the Next.js dev server. This allows `/api/parse-cv` to invoke `scripts/extract_cv.py` for more reliable PDF text extraction.

## AI-powered sourcing queries

The sourcing workspace now delegates query generation to OpenAI GPT-4.1 Mini via `/api/generate-search-query`.  
Set the `OPENAI_API_KEY` environment variable before running the app so the API route can call the model:

```bash
export OPENAI_API_KEY=sk-your-key-here
pnpm dev
```

The model receives the sourcing rules (site filter, OR-expansions, mandatory negative filters) and returns only the final Google query string that the UI renders and opens in a new tab.
