#!/bin/sh

#Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#SPDX-License-Identifier: MIT-0

aws polly put-lexicon \
--name compass \
--content file://lexicons.pls

aws polly list-lexicons
