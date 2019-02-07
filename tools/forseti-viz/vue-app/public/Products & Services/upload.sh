#!/bin/sh

export TEMP_DIR="public"
export BUCKET_NAME="gs://forseti-viz-icons"

mkdir $TEMP_DIR 

find . -name "*.png" -exec cp {} $TEMP_DIR \; -print

gsutil cp -R $TEMP_DIR $BUCKET_NAME

gsutil iam ch allUsers:objectViewer $BUCKET_NAME
