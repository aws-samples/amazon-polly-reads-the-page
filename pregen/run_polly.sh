#!/bin/sh

if [[ -z "${S3_BUCKET}" ]]; then
  echo Environment variable S3_BUCKET not defined
fi

if [ "$#" -lt "4" ]; then
    echo "USAGE run_polly.sh SSML LANG VOICE OUTPUTDIR LEXICON?"
    exit 1
fi

#Inputs
# S3_BUCKET=polly-tts-mhavey #TODO make this env var
RUN_ID=`date +"%Y%m%dT%H%M%S"`
SSML=$1
LANG=$2
VOICE=$3
OUTPUTDIR=$4
LEXICON=$5

# TODO usage check SSML LANG VOICE OUTPUTDIR LEX?
# S3_BUCKET DEFINES

if [[ -z "${LEXICON}" ]]; then
  echo No lexicon specified
else
  #LEXOPT=`echo '--lexicon-names="'${LEXICON}'"'`
  LEXOPT=`echo '--lexicon-names='${LEXICON}''`
fi
echo $LEXOPT

aws polly start-speech-synthesis-task \
		--engine neural \
		--language-code $LANG \
	    --output-format mp3 \
	    --output-s3-bucket-name $S3_BUCKET \
	    --output-s3-key-prefix $RUN_ID/$SSML/$LANG/$VOICE \
	    --text  file://$SSML \
	    --text-type ssml \
    	--voice-id $VOICE  $LEXOPT

aws polly start-speech-synthesis-task \
		--engine neural \
		--language-code $LANG \
	    --output-format json \
	    --output-s3-bucket-name $S3_BUCKET \
	    --output-s3-key-prefix $RUN_ID/$SSML/$LANG/$VOICE \
	    --text  file://$SSML \
	    --text-type ssml \
	    --speech-mark-types ssml sentence \
    	--voice-id $VOICE

# Wait for complettion, Coulud call Polly list task, but instead just check S3 for both the files: mp3 and marks
echo Step 4 - wait for speech generation
NUMFILES=0
while [ $NUMFILES -ne 2 ]
do
	echo Checking
	NUMFILES=`aws s3 ls $S3_BUCKET/$RUN_ID --recursive | wc -l`
	echo $NUMFILES
	sleep 2
done

# grab the files into outputdir, clean up the names
mkdir -p $OUTPUTDIR/$RUN_ID
mkdir -p $OUTPUTDIR/$LANG
aws s3 sync s3://$S3_BUCKET/$RUN_ID $OUTPUTDIR/$RUN_ID  
mv $OUTPUTDIR/$RUN_ID/$SSML/$LANG/$VOICE*.mp3 $OUTPUTDIR/$LANG/$VOICE.mp3
mv $OUTPUTDIR/$RUN_ID/$SSML/$LANG/$VOICE*.marks $OUTPUTDIR/$LANG/$VOICE.marks
rm -rf $OUTPUTDIR/$RUN_ID

