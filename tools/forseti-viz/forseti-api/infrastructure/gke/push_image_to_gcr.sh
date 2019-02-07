#!/bin/sh

export PROJECT_ID="$(gcloud config get-value project -q)"
export CONTAINER_NAME="nodedocker"

gcloud docker -- push gcr.io/${PROJECT_ID}/$CONTAINER_NAME
