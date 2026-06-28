FROM python:3.12-slim

# Install system dependencies (Java 21 for Keycloak, Nginx, curl)
RUN apt-get update && apt-get install -y \
    openjdk-17-jre-headless \
    nginx \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Download and extract Keycloak 25
WORKDIR /opt
RUN curl -L https://github.com/keycloak/keycloak/releases/download/25.0.0/keycloak-25.0.0.tar.gz | tar xz \
    && mv keycloak-25.0.0 keycloak

# Set working directory for application
WORKDIR /app

# Copy FastAPI backend code and dependencies
COPY backend /app
RUN pip install --no-cache-dir .
ENV PYTHONPATH=/app/src

# Copy Keycloak resources and configurations
COPY ./docker/keycloak/realm-iitd.json /opt/keycloak/data/import/realm-iitd.json
COPY ./keycloak/themes/iitd /opt/keycloak/themes/iitd

# Copy Nginx router config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy startup manager script
COPY ./scripts/start-combined.sh /app/start-combined.sh
RUN chmod +x /app/start-combined.sh

# Expose Hugging Face standard port
EXPOSE 7860

CMD ["/app/start-combined.sh"]
