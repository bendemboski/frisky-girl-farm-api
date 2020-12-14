#!/bin/bash

echo "retrieving credentials..."
mkdir -p ~/.aws
echo "$AWS_CREDENTIALS" > ~/.aws/credentials
echo "$GOOGLE_SHEETS_CONFIG" > config.prod.json

echo "deploying..."
yarn deploy
