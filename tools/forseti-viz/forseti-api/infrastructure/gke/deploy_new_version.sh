#!/bin/sh

export PROJECT_ID="$(gcloud config get-value project -q)"
export APP_NAME="nodedocker"
export DEPLOYMENT_NAME="nodedocker-web"
export PATH_TO_VERSION_FILE="infrastructure/gke/VERSION"
export VERSION=$(cat $PATH_TO_VERSION_FILE)

docker build -t gcr.io/${PROJECT_ID}/${APP_NAME}:${VERSION} .

gcloud docker -- push gcr.io/${PROJECT_ID}/${APP_NAME}:${VERSION}

echo "kubectl set image deployment/${DEPLOYMENT_NAME} ${DEPLOYMENT_NAME}=gcr.io/${PROJECT_ID}/${APP_NAME}:${VERSION}"
kubectl set image deployment/${DEPLOYMENT_NAME} ${DEPLOYMENT_NAME}=gcr.io/${PROJECT_ID}/${APP_NAME}:${VERSION}


function increment_version() {
    VERSION=$(cat $PATH_TO_VERSION_FILE)
    VERSION_NUMBER=$(echo $VERSION | sed 's/v//g')
    NEW_VERSION_NUMBER=$((VERSION_NUMBER+1))
    echo v$NEW_VERSION_NUMBER > $PATH_TO_VERSION_FILE

    echo "incremented version from" $VERSION "to" $NEW_VERSION_NUMBER
}


# inc version
increment_version