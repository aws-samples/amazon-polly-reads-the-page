#Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#SPDX-License-Identifier: MIT-0

if [ "$#" -ne "1" ]; then
    echo "USAGE setup.sh STACKNAME"
    exit 1
fi

STACKNAME=$1
echo Setup for $STACKNAME

# setup vars
aws cloudformation describe-stack-resources --stack-name  $STACKNAME --output text | awk -F'\t' '{print $2 " " $3}' | grep -v NOT_CHECKED> vars.txt
S3_BUCKET=`cat vars.txt | grep S3Bucket | awk '{print $2}'`
IDP=`cat vars.txt | grep IdentityPool | grep -v IdentityPoolRoleMapping | awk '{print $2}'`
REGION=`echo $IDP | awk -F: '{print $1}'`
echo "const env = {" > ../web/env.js
echo ' "S3_BUCKET":' \"$S3_BUCKET\", >> ../web/env.js
echo ' "REGION":' \"$REGION\", >> ../web/env.js
echo ' "IDP":' \"$IDP\" >> ../web/env.js
echo "};" >> ../web/env.js

#const env = {
#    "S3_BUCKET": "REPLACE",
#    "REGION": "REPLACE",
#    "IDP": "REPLACE",
#}

# make scripts executable
cd ..
chmod +x run_webserver.sh
cd pregen
chmod +x saxon
chmod +x *.sh
chmod +x example/*.sh

# Install Python dependencies
sudo pip install html5lib

# Install saxon
mkdir tmp
cd tmp
wget https://sourceforge.net/projects/saxon/files/Saxon-HE/10/Java/SaxonHE10-6J.zip/download
unzip download
cd ..
cp tmp/saxon-he-10.6.jar .
rm -rf tmp

# add the lexicon
cd ../pregen/example
./addlexicon.sh

echo Your S3 Bucket is
echo $S3_BUCKET
