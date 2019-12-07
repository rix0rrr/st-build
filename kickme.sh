#!/bin/bash
set -eu
aws sqs send-message --queue-url https://sqs.us-west-2.amazonaws.com/993655754359/StBuildStack-Queue4A7E3555-1GIBZVYWLNHAU --message-body '{}'
