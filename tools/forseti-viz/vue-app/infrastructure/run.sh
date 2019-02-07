#!/bin/sh

export PROJECT_ID="$(gcloud config get-value project -q)"

export IMAGE_NAME="forsetiviz"

docker build -t gcr.io/${PROJECT_ID}/$IMAGE_NAME .
docker run --rm -d -p 8081:8081 gcr.io/$PROJECT_ID/$IMAGE_NAME