#!/bin/sh

DEPLOYMENT="nodedocker-web"

kubectl scale deployment $DEPLOYMENT --replicas=3

kubectl get deployment $DEPLOYMENT

kubectl get pods