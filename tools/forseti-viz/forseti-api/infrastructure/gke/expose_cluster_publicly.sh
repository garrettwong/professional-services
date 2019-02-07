#!/bin/sh

export DEPLOYMENT="nodedocker-web"

kubectl expose deployment $DEPLOYMENT --type=LoadBalancer --port 80 --target-port 8080

kubectl get service
