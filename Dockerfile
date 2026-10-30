# Node 24 LTS, on a release with the 21 October 2026 security fixes (CVE-2026-111497 and others). Node 20 gets no fixes any more.
FROM node:24.22.1-alpine

# Install pnpm
# The version pinned in package.json ("packageManager"), not whatever is newest on the day of the build.
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

# Create non-root user for security
RUN addgroup -S rosterr && adduser -S rosterr -G rosterr

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json pnpm-lock.yaml ./
# Copy Prisma schema
COPY prisma ./prisma/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Prisma needs DATABASE_URL to exist (syntactically) to generate a client,
# but doesn't need to connect yet — the real value is supplied at runtime
# via docker-compose/deployment env vars, which override this placeholder.
ENV DATABASE_URL="mysql://user:password@localhost:3306/placeholder"

# Generate Prisma client for the specific platform
RUN pnpm exec prisma generate

# Bundle app source
COPY . .

# `next build` imports route modules to collect page data, which pulls in
# lib/withSession.ts — it validates SESSION_SECRET at import time (throws
# if weak/missing), so the build stage needs a placeholder strong enough
# to pass that check. Set for the build command only, so it is not in the image's environment: a container started without its own
# SESSION_SECRET refuses to start instead of running on a value that anyone can read in this repository.

# Build the app
RUN SESSION_SECRET="ENoH2lDRIZSeGoLPJWJxkXiSYLA0nXT3936mQAlvlbg=" pnpm run build

# Set ownership to non-root user
RUN chown -R rosterr:rosterr /usr/src/app

# Switch to non-root user
USER rosterr

# Expose port 3000
EXPOSE 3000

# Start the app
CMD ["pnpm", "run", "start"]