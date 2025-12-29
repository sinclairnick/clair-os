#!/bin/sh
set -e

# API URL from env, default to http://openfga:8080
FGA_API_URL="${OPENFGA_API_URL:-http://openfga:8080}"
STORE_NAME="clairos"
MODEL_FILE="${MODEL_FILE:-./model.fga}"

echo "Checking OpenFGA at $FGA_API_URL..."

# Wait for OpenFGA to be ready
until curl -s "$FGA_API_URL/healthz" > /dev/null; do
  echo "Waiting for OpenFGA..."
  sleep 2
done

# List stores
STORES_JSON=$(fga store list --api-url "$FGA_API_URL")
STORE_ID=$(echo "$STORES_JSON" | jq -r ".stores[] | select(.name == \"$STORE_NAME\") | .id")

if [ -z "$STORE_ID" ]; then
    echo "Creating store '$STORE_NAME'..."
    CREATE_JSON=$(fga store create --name "$STORE_NAME" --api-url "$FGA_API_URL")
    STORE_ID=$(echo "$CREATE_JSON" | jq -r ".id")
    echo "Created OpenFGA store: $STORE_ID"
else
    echo "Found existing OpenFGA store: $STORE_ID"
fi

echo "Writing authorization model from $MODEL_FILE..."
fga model write --store-id "$STORE_ID" --file "$MODEL_FILE" --api-url "$FGA_API_URL"
echo "Model updated."
