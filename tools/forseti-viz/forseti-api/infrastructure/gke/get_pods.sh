#!/bin/sh

export PROJECT_ID="$(gcloud config get-value project -q)"

kubectl get pods