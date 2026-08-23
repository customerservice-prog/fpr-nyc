FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
ENV HOSTNAME=0.0.0.0
COPY package*.json .npmrc ./
RUN npm install --legacy-peer-deps --ignore-scripts
COPY . .
RUN npx prisma generate
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
RUN npm run build
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -H 0.0.0.0 -p ${PORT:-3000}"]
