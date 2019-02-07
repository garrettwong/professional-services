#!/bin/sh

# create GKE cluster
kubectl delete service nodedocker-web

# wait for load balancer provisioned for the service to be deleted
gcloud compute forwarding-rules list

sleep 30000

# delete cluster
gcloud container clusters delete nodedocker-cluster