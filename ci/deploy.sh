#!/bin/bash

echo "decrypting credentials..."
openssl aes-256-cbc -K $encrypted_84706aa230b9_key -iv $encrypted_84706aa230b9_iv -in ci/credentials.tar.enc -out credentials.tar -d
tar -xf credentials.tar
mkdir -p ~/.aws
mv aws-credentials ~/.aws/credentials
echo "deploying..."
yarn deploy
