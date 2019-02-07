#!/bin/sh

export CLUSTER_NAME="nodedocker-cluster"

gcloud container clusters get-credentials $CLUSTER_NAME