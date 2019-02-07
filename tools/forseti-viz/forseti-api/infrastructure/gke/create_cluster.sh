#!/bin/sh
CLUSTER_NAME="nodedocker-cluster"

gcloud container clusters create $CLUSTER_NAME --num-nodes=3

