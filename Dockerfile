FROM node:24-alpine
WORKDIR /app
RUN apk add --no-cache openssl
ENV HOSTNAME=0.0.0.0
COPY package*.json .npmrc ./
RUN npm ci --legacy-peer-deps --ignore-scripts
COPY . .
RUN npx prisma generate
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# Public site origin must exist at build time: Next.js inlines NEXT_PUBLIC_* values
# and prerendered pages (canonical URLs, Open Graph, JSON-LD) are generated here.
ARG NEXT_PUBLIC_SITE_URL=https://friendlypartyrentalnyc.com
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npm run build
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && (node scripts/submit-indexnow.mjs || true) && exec npx next start -H 0.0.0.0 -p ${PORT:-3000}"]
