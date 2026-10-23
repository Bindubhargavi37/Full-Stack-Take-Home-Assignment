-- Creates the application role and database. Safe to run more than once.
-- Run as a PostgreSQL superuser (postgres). Values come from psql variables:
--   app_user, app_password, app_db
-- CREATEDB lets `prisma migrate dev` create its temporary shadow database.

SELECT format('CREATE ROLE %I LOGIN PASSWORD %L CREATEDB', :'app_user', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user')
\gexec

SELECT format('ALTER ROLE %I LOGIN PASSWORD %L CREATEDB', :'app_user', :'app_password')
\gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'app_db', :'app_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'app_db')
\gexec

\echo Database ready.
