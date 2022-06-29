#Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#SPDX-License-Identifier: MIT-0

cd ..
python FixHTML.py ../web/PRTPStaticCustom.html example/tmp_wff.html
./gen_ssml.sh example/tmp_wff.html example/custom.xslt example/tmp.ssml
./run_polly.sh example/tmp.ssml en-US Joanna ../web/polly/PRTPStaticCustom compass
./run_polly.sh example/tmp.ssml en-US Matthew ../web/polly/PRTPStaticCustom compass
