#Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#SPDX-License-Identifier: MIT-0

if [ "$#" -ne "1" ]; then
    echo "USAGE run_webserver.sh INGRESS_CIDR"
    exit 1
fi

HTTP_PID=`ps -ef | grep http.server | grep python | awk '{print $2}'`
echo Killing $HTTP_PID
kill $HTTP_PID

# Set from output of CloudFormation stack
CLOUD9_ID=`cat setup/vars.txt | grep Cloud9BuildTest | awk '{print $2}'`
echo Using Cloud9 $CLOUD9_ID

# Set to your preferred port
PORT=8080

# Restrict ingress for the port to the specified CIDR.
# To restrict to just your machine, find your IP using https://whatismyipaddress.com/. 
# Append /32 to form the CIDR
# Example: 174.112.66.154/32
INGRESS_CIDR=$1

# Step 1. Modify security group to ensure this instance allows web ingress from your browser
# This only needs to be done once. The second time it will error, but that's harmless.
aws ec2 describe-security-groups --filters Name=tag:aws:cloud9:environment,Values=$CLOUD9_ID --query 'SecurityGroups[].GroupId' --out text > SGOUT.txt
SG=`cat SGOUT.txt`

echo Setting ingress for $SG based on $PORT and $INGRESS_CIDR
aws ec2 authorize-security-group-ingress --group-id $SG --protocol tcp --port $PORT --cidr $INGRESS_CIDR

# which IP
echo Public IP is
TOKEN=`curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"` \
&& curl -H "X-aws-ec2-metadata-token: $TOKEN" -v http://169.254.169.254/latest/meta-data/

curl -H "X-aws-ec2-metadata-token: $TOKEN" -v http://169.254.169.254/latest/meta-data/public-ipv4
echo " "


# Step 2 - Run Python's simple HTTP server
nohup python -m http.server $PORT & >nohup.out 2>nohup.err
