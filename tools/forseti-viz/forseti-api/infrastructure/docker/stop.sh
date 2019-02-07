#!/bin/sh

CONTAINER_NAME="nodedocker"

docker rm $(docker ps -a | grep $CONTAINER_NAME | awk '{print $1}')