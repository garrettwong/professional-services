#!/bin/sh

set -e

infrastructure/docker/build.sh
infrastructure/docker/run.sh