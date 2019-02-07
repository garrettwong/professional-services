#!/bin/sh

# create GKE cluster
infrastructure/gke/create_cluster.sh

# set credentials
infrastructure/gke/get_credentials.sh