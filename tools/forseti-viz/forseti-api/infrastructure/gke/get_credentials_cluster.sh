#!/bin/sh

CLUSTER_NAME=$1

# updates your ~/.kube/config file with the cluster info
gcloud container clusters get-credentials $CLUSTER_NAME