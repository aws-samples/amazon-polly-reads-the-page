#!/bin/sh

if [ "$#" != "3" ]; then
    echo "USAGE gen_ssml.sh HTML XSLT SSML"
    exit 1
fi

PATH=$PATH:.

HTML=$1
XSLT=$2
SSML=$3

echo GEN SSML using $HTML $XSLT $SSML
saxon -s:$HTML -xsl:$XSLT -o:$SSML
