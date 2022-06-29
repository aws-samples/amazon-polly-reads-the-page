#Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#SPDX-License-Identifier: MIT-0

cd ..
python FixHTML.py ../web/PRTPStaticConfig.html example/tmp_wff.html
python ModGenericXSLT.py example/transform_config.json example/tmp.xslt
./gen_ssml.sh example/tmp_wff.html example/tmp.xslt example/tmp.ssml
./run_polly.sh example/tmp.ssml en-US Joanna ../web/polly/PRTPStaticConfig compass
./run_polly.sh example/tmp.ssml en-US Matthew ../web/polly/PRTPStaticConfig compass
