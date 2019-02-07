#!/bin/sh
DEPLOYMENT="nodedocker-web"

kubectl get deployment $DEPLOYMENT -o yaml --export > myapp.yaml