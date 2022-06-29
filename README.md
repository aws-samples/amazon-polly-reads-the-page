## PollyReadsThePage

# PollyReadsThePage Blog Example

This repository contains code that accompanies the post "Read Web Pages and Highlight Using Amazon Polly" on the AWS ML blog. (TODO URL)

## Introduction
PollyReadsThePage (PRTP) allows the publisher of a web page to drop onto their page an audio control. When the visitor chooses Play on the control, the control reads the page and highlights the content. The solution uses Polly’s general capability to synthesize speech from text, but how does the solution decide which text from the page to synthesize? How does it know what text to highlight during playback?

Our solution invokes the Polly service to generate two artifacts for each page:
-	The audio content in a format playable by the browser: mp3. 
-	A speech marks file that indicates for each sentence of text: the time during playback that the sentence is read; and the location on the page the sentence appears 

When the visitor chooses Play, the solution plays the mp3 file. As the audio is read, the solution checks the time, finds in the marks file which sentence to read at that time, locates it on the page, and highlights it.

## Setup
We provide a self-contained demo that you can use to follow along with the blog post. The post describes this setup. We repeat those instructions here.

We also describe how to setup PRTP in your own environment. We will call this "advanced" setup.

### Demo Setup 
Use CloudFormation to setup an S3 bucket, a Cognito identity pool, a Cloud9 IDE, and IAM roles. Create a stack based on template in cfn/prtp.yml. 

1. Download a local copy of cfn/prtp.yml. 
2. In CloudFormation console, create a stack with new resources. When prompted, upload the template file from your local clone in cfn/prtp.yml. Name your stack and override parameters if necessary.  
3. Check the CloudFormation stack is successfully created. It creates the following:

- S3 bucket to hold generated audio files from Polly.
- Cognito identity pool. This is used for dynamic web pages to access Polly and S3 to render audio.
- Cloud9 IDE. This serves two purposes. First, you can use it as your pregen build server. Second, it is a test web server to host the audio-enabled pages.

Make note of the values in the Outputs section of the CloudFormation stack. You will need the following values in subsequent steps.


4. In the console, navigate to Cloud9 and open the IDE. Its name is 'PRTPDemoCloud9'.
5. In the IDE, select the bash terminal near the bottom. Confirm your current directory is /home/ec2-user/environment. Set the IDE by running the following:

```
# Obtain PRTP code
cd /home/ec2-user/environment
git clone git@github.com:aws-samples/amazon-polly-reads-the-page.git

# Navigate to that code
cd amazon-polly-reads-the-page/setup

# Install Saxon and html5 Python lib. For pre-gen.
sh ./setup.sh <StackName>

# Run Python simple HTTP server
./runwebserver.sh <IngressCIDR> 
```

For <StackName> use the name you gave the CloudFormation stack. For <IngressCIDR>, specify a CIDR range of IP addresses allowed to access the web server. To restrict access to the browser on your local machine, find your IP address using https://whatismyipaddress.com/ and append /32 to specify the CIDR range. For example, if your IP is 10.2.3.4, the CIDR is 10.2.3.4/32. The server listens on port 8080. The public IP address on which the server listens is given in the output. For example:

Public IP is
3.92.33.223

6. Test the static and dynamic pages by following along with the post.

### Advanced Setup 
To setup in your own environment, follow these steps.

#### S3 Bucket
Using your AWS account create an S3 bucket to hold Polly audio output files. Create in the same AWS region you intend to use for Polly. The bucket may be private. You may encrypt the bucket using AES256. If you are serving dynamic pages, you must enable CORS on the bucket.  Refer to cfn/prtp.yml for an example of how to setup the bucket resource.

#### Cognito
If you are serving dynamic pages, you need to create a Cognito Identity Pool that allows unauthenticated users access to Polly and the S3 bucket. Using your AWS account create the pool and the associated IAM role. Create in the same AWS region you intend to use for Polly. Refer to cfn/prtp.yml for an example of how to setup the bucket resource.

#### Build Server for Pre-Gen/Static Pages
If you are serving static pages, you need to setup a build machine to run the pre-gen scripts. Choose a machine that has access both to AWS and to the content folder of your web server. 

On this machine, you must install the AWS CLI (https://aws.amazon.com/cli/). Configure the CLI with an identity whose role allows it full access to Polly and to the S3 bucket. Set the region to the region in which you intend to run Polly.

Your machine requires Python 3. You must install the html5lib: sudo pip install html5lib

You must install Saxon, as XSLT tool to map HTML to SSML. To do this, download https://sourceforge.net/projects/saxon/files/Saxon-HE/10/Java/SaxonHE10-6J.zip/download. Unzip. The file saxon-he-10.6.jar. Copy it to the pregen folder of your local clone of this repo. 

#### Running Pre-Gen
Scripts to run pre-gen are in the pregen folder. An example is provided in pregen/example. An example of how to setup is setup/setup.sh. The main tools you need are the following:

##### Pre-Gen Tools

- pregen/FixHTML.py. Repairs source HTML by making it well-formed, conforming to WHATWG. You pass two arguments: path to your source HTML file and path to "repaired" HTML file. The second file need not exist; it will be created. (Your souce HTML must also have the PRTP audio control. This is needed because pre-gen keeps track of where text occurs on the page. If the audio control is not in place when the audio is rendered, the locations of text may be incorrect. See more in Pre-Gen Run below.)

- pregen/un_ssml.sh. Runs XSLT transform on "repaired" source HTML to produce SSML for input to Polly. Uses Saxon. It assumes you are running from pregen folder; check your saxon script can resolve the JRE and saxon HE jar file correctly. It takes three parameters: path to repaired HTML file, path to XSLT file, path to SSML file. The third file need not exist; it will be created.

- pregen/generic.xslt: An XSLT tranform that you can use in run_ssml.sh. This does default transformation of web pages. If this transform does not meet your needs you can write your own or use the config-driven approach.

- pregen/example/custom.xslt: An example of what a custom XSLT looks like.

- pregen/ModGenericXSLT.py: Python program that modifies generic.xslt with "advice" from you on what to extract from the HTML. It takes two arguments: path to a JSON file containing the "advice", path to XSLT file to be created by applying the advice to generic.xslt. The second file need not exist; it will be created. 

- pregen/example/transform_config.json: An example of the "advice". Notice it allows both inclusions and exclusions. You may specify either ID or XPath expressions to indicate sections to include and exclude. 

- pregen/run_polly.sh: Script to synthesize speech using Polly. Its arguments are SSML LANG VOICE OUTPUTDIR LEXICON?. SSML is path to SSML file output from run_ssml.sh. LANG and VOICE are Polly language and neural voice parameters (https://docs.aws.amazon.com/polly/latest/dg/ntts-voices-main.html). OUTPUTDIR is the folder in which to save the generated output files, of which there are two: $OUTPUTDIR/$LANG/$VOICE.mp3 and $OUTPUTDIR/$LANG/$VOICE.marks. LEXICON is an optional parameter; pass the name of a lexicon added to Polly if you wish to apply the lexicon during speech synthesis.

##### Pre-Gen Run
###### Add Audio Control to Page
To run pregen on a static page, you must first add the PRTP control to the page. web/PRTPStaticDefault.html shows an example. Here is how it adds the audio control:

```
<table id="prtp-audio"><tr><td>
<audio id="audio" controls="true">
  <source src="polly/PRTPStaticDefault/en-US/Joanna.mp3" type="audio/mpeg">
Your browser does not support the audio element.
</audio> </td>
<td><select id="voiceSelect" onchange="setVoice(document.getElementById('voiceSelect').value);">
<option value="Joanna" selected>Joanna</option>
<option value="Matthew" >Matthew</option>
</select>
</td>
<td><select id="speedSelect" onchange="document.getElementById('audio').playbackRate=document.getElementById('speedSelect').value;">
<option value="0.25">0.25</option>
<option value="0.5">0.5</option>
<option value="0.75">0.75</option>
<option value="1.0" selected>1.0</option>
<option value="1.25">1.25</option>
<option value="1.5">1.5</option>
<option value="1.75">1.75</option>
<option value="2.0">2.0</option>
</select></td>
</tr></table>
<script type="text/javascript">
const POLLY_LANG_FULL = "en-US";
const POLLY_PAGE = "PRTPStaticDefault";
const POLLY_VOICES  = ["Joanna", "Matthew"]; 
</script>
<script type="text/javascript" src="env.js"></script>
<script type="text/javascript" src="PRTP.js">

</script>
```

As this block shows, PRTP uses the common HTML5 audio control. By default, it expects the mp3 audio in polly/PRTPStaticDefault/en-US/Joanna.mp3. This is a relative path and MUST be in your web content folder in the correct location.  

Three constants tell PRTP about your page's audio configuration;
- POLLY_LANG_FULL: The language. In this case, it is en-US.
- POLLY_PAGE: The web folder in which your audio files are located.
- POLLY_VOICES: The neural voices in which speech is rendered.

Given these settings, you should have the following audio files:

polly/PRTPStaticDefault/en-US/Joanna.marks
polly/PRTPStaticDefault/en-US/Joanna.mp3
polly/PRTPStaticDefault/en-US/Matthew.marks
polly/PRTPStaticDefault/en-US/Matthew.mp3

You include PRTP.js, which handles the highlighting and changes in voice selection.

You also include env.js, but it is used only for dynamic pages, discussed in Running Dynamic below.

###### Repair HTML
You now need to repair your HTML by running FixHTML.py. Here's an example that takes your source.html as input and saves the repaired version in tmp_wff.html

python FixHTML.py source.html tmp_wff.html

###### Tranform to SSML
You use XSLT to transform the repaired HTML to SSML.

There are three cases:
1. Default rendering:
 ./gen_ssml.sh tmp_wff.html generic.xslt tmp.ssml
2. Config-based rendering:
python ModGenericXSLT.py transform_config.json tmp.xslt
./gen_ssml.sh tmp_wff.html tmp.xslt tmp.ssml

where transform_config.json is:

```
{
 "inclusions": [ 
 	{"id" : "title"} , 
 	{"id": "main"}, 
 	{"id": "maintable"}, 
 	{"id": "qbtable"}, 
 	{"xpath": "div[@id='pivtable']"}
 ],
 "exclusions": [
 	{"id": "wrapup"}
 ]
}

```

3. Custom rendering:
./gen_ssml.sh tmp_wff.html custom.xslt tmp.ssml

Take a look at pregen/example/custom.xslt to understand how it works.

###### Use Polly to Synthesize Speech
Finally run Polly to synthesize speech based on the SSML, as in the following example:

```
./run_polly.sh tmp.ssml en-US Joanna ../web/polly/PRTPStaticDefault compass
./run_polly.sh tmp.ssml en-US Matthew ../web/polly/PRTPStaticDefault compass
```

In this example, the output files are written to ../web/polly/PRTPStaticDefault. In your case, ensure they are written to the correct location in your web content folder.

Try playing the mp3 files using the media player on your machine. Inspect the marks files. If these files are not correct, troublehsoot the pregen steps.

###### Access the Page
Now access the page to determine if it plays the audio and highlights properly. If you find any issues, check that the audio files are on the web server in the correct location. Open the Web Console in your browser to check for errors in PRTP.js.

#### Running Dynamic
Audio for a dynamic page does not need to be pre-generated. Rather, the page calls Polly to generate audio. It uses Cognito to obtain an AWS identity with access to Polly and the S3 bucket. In your web content folder, place a file called env.js in the same folder as the HTML file. env.js should point to the region, S3 bucket, and Cognito IDP for your environment.  Here is an example:

```
const env = {
 "S3_BUCKET": "prtpstack-s3bucket-randomString",
 "REGION": "us-east-1",
 "IDP": "us-east-1:randomString"
};
```

Your page is responsible for extracting text content to be synthesized by Polly. You may use default, config-driven, or custom rendering. The page web/PRTPDyanmic.html gives examples of each.

Here is an excerpt. For more discussion, refer to the blog post.

```
<!-- Setup -->
<script type="text/javascript">
const POLLY_PAGE = null; // use null for dynamic
const POLLY_LANG_FULL = "en-US";
const POLLY_VOICES  = ["Joanna", "Matthew"]; 
</script>

<!-- Use the AWS SDK. This is V2. Will move to V3. -->
<script src="https://sdk.amazonaws.com/js/aws-sdk-2.1081.0.min.js"></script>

<!-- Include the PRTP -->
<script type="text/javascript" src="env.js"></script>
<script type="text/javascript" src="PRTP.js"></script>

<!-- Page stuff I need to do. Notably this includes prepping dynamic audio -->
<script type="text/javascript">

/*
Here is the function where I render the dynamic audio.
Triggers: page load, greek philosopher search button
*/
function prepAudio() { 
   const urlParams = new URLSearchParams(window.location.search);
   const dynOption = urlParams.has("dynOption") ? urlParams.get("dynOption") : "default";
   if (dynOption == "default") {
      buildSSMLFromDefault();
      chooseRenderAudio();
      setVoice();
   }
   else if (dynOption=="config") {
      // logic to speak the page
      const ssml = buildSSMLFromConfig({
       "inclusions": [ 
         {"id" : "title"} , 
         {"id": "main"}, 
         {"id": "maintable"}, 
         {"id": "phil-result"},
         {"id": "qbtable"}, 
       ],
       "exclusions": [
         {"id": "wrapup"}
       ]
      });
      chooseRenderAudio();
      setVoice();
   }
   else if (dynOption == "custom") {
      createSSML();
      buildSSMLSection(getElementByXpath("//*[@id='title']"), []);
      buildSSMLSection(getElementByXpath("//*[@id='main']"), []);

      // for main table, adjust the order NW, SW, NE, SE
      addSSMLExplainer("Will read main tiles in order: NW, SW, NE, SE");
      const nw = getElementByXpath("//*[@id='maintable']//tr[1]/td[1]");
      const sw = getElementByXpath("//*[@id='maintable']//tr[2]/td[1]");
      const ne = getElementByXpath("//*[@id='maintable']//tr[1]/td[2]");
      const se = getElementByXpath("//*[@id='maintable']//tr[2]/td[2]");
      [nw, sw, ne, se].forEach(dir => buildSSMLSection(dir, []));

      addSSMLExplainer("Skipping philosopher results");

      addSSMLExplainer("Reading QB table first three rows with inline help");

      const qbHeadersX = getElementsByXpath("//*[@id='qbtable']//tr[1]/th");
      const qbRows1_3X = getElementsByXpath("//*[@id='qbtable']//tr[position() > 1 and position() <= 4]");
      const qbHeaders = [];
      const qbRows = [];
      while(node = qbHeadersX.iterateNext()) {
         qbHeaders.push(node.innerText);
      }
      var rowNum = 0;
      while(node = qbRows1_3X.iterateNext()) {
         rowNum++;
         addSSMLExplainer("Row " + rowNum);
         for (var tdi = 0; tdi < node.childNodes.length; tdi++) {
            addSSMLExplainer(qbHeaders[tdi]);
            const cellText = node.childNodes[tdi].innerText;
            if (cellText == "Tom Brady") {
               addSSMLMark(getXpathOfNode(node.childNodes[tdi]));
               startSSMLParagraph();
               startSSMLTag("prosody", {"volume": "x-loud"});
               addSSMLText(cellText);
               endSSMLTag();
               endSSMLParagraph();
            }
            else {
               addSSMLValueFromSection(node.childNodes[tdi]);
            }
         }
         qbRows.push(node);
      }

      chooseRenderAudio();
      setVoice();
   }
   else {
      alert("Illegal dynamic option *" + dynOption + "*, Use default|custom|config");
   }

}
```


## Cleanup
To cleanup, delete the stack that you created above.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

