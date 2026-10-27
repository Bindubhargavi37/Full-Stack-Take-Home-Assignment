import { PrismaClient } from '@prisma/client';

// One Prisma client for the whole app; repositories import it from here.
export const prisma = new PrismaClient();
