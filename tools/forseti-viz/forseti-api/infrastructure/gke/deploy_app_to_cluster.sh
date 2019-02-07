#!/bin/sh

export PROJECT_ID="$(gcloud config get-value project -q)"
export IMAGE="nodedocker"
export DEPLOYMENT="$IMAGE-web"

kubectl run $DEPLOYMENT --image=gcr.io/${PROJECT_ID}/$IMAGE --port 8080