# Use a specific Node.js version for better reproducibility
FROM node:23.3.0-slim AS builder

# Install pnpm globally and install necessary build tools
RUN npm install -g pnpm@9.4.0 && \
    apt-get update && \
    apt-get install -y git python3 make g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set Python 3 as the default python
RUN ln -s /usr/bin/python3 /usr/bin/python

# Set the working directory
WORKDIR /app

# Copy package.json and other configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json lerna.json *.json ./

# Copy the rest of the application code
COPY packages/adapter-redis/ ./packages/adapter-redis/
COPY packages/adapter-postgres/ ./packages/adapter-postgres/
COPY packages/core/ ./packages/core/
COPY packages/client-twitter/ ./packages/client-twitter/
COPY packages/moxie-agent-lib/ ./packages/moxie-agent-lib/
COPY packages/plugin-bootstrap/ ./packages/plugin-bootstrap/
COPY packages/client-moxie/ ./packages/client-moxie/
COPY packages/client-auto/ ./packages/client-auto/
COPY packages/plugin-moxie-big-fan/ ./packages/plugin-moxie-big-fan/
COPY packages/plugin-moxie-swap/ ./packages/plugin-moxie-swap/
COPY packages/plugin-moxie-balance/ ./packages/plugin-moxie-balance/
COPY packages/plugin-moxie-token-details/ ./packages/plugin-moxie-token-details/
COPY packages/plugin-moxie-trading-automations/ ./packages/plugin-moxie-trading-automations/
COPY packages/plugin-moxie-groups/ ./packages/plugin-moxie-groups/

COPY moxie-agent/ ./moxie-agent/
COPY moxie-broadcasting-agent/ ./moxie-broadcasting-agent/

COPY scripts ./scripts
COPY characters ./characters
COPY client ./client
COPY docs ./docs
COPY moxie-agent ./moxie-agent
RUN cd ./packages/moxie-agent-lib && pnpm install --no-frozen-lockfile && pnpm run build && cd ../../


# Install dependencies and build the project
RUN pnpm install --no-frozen-lockfile --r && pnpm build --force


# Create a new stage for the final image
FROM node:23.3.0-slim

# Install runtime dependencies if needed
RUN npm install -g pnpm@9.15.4 && \
    apt-get update && \
    apt-get install -y git python3 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built artifacts and production dependencies from the builder stage
#COPY --from=builder /app/ ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/.npmrc ./
COPY --from=builder /app/turbo.json ./
COPY --from=builder /app/lerna.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/characters ./characters
COPY --from=builder /app/moxie-agent ./moxie-agent
COPY --from=builder /app/client ./client
COPY --from=builder /app/docs ./docs

# Expose the necessary ports
EXPOSE 3000 5173

# Set the command to run the application
CMD ["pnpm", "run", "start:debug", "--character=./characters/moxie.character.json"]
