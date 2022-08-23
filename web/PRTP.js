//Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
//SPDX-License-Identifier: MIT-0

/**
Javascript support for text-to-speech 
// expected input
// POLLY_LANG - en/fr
// POLLY_PAGE = e.g., about.html. Used in STATIC MODE only.
// POLLY_VOICES - e.g., ["Joanna", "Matthew"]; Elem 0 is initial voice
// and assume control audio

//https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/getting-started-browser.html
//In main HTML include script
//<script src="https://sdk.amazonaws.com/js/aws-sdk-SDK_VERSION_NUMBER.min.js"></script>
 */

/**
Intialization and audio control
 */


const AUDIO_MP3 = {};
const AUDIO_MARKS = {};
const SCOLL_MODE = "1";

// STATIC MP3/MARKS Path
if (POLLY_PAGE && POLLY_PAGE.length > 0) {
    console.log("GETTING STATIC POLLY OUTPUT");
    POLLY_VOICES.forEach(v => AUDIO_MP3[v] = `polly/${POLLY_PAGE}/${POLLY_LANG_FULL}/${v}.mp3`);
    POLLY_VOICES.forEach(v => AUDIO_MARKS[v] = `polly/${POLLY_PAGE}/${POLLY_LANG_FULL}/${v}.marks`);
    console.log(AUDIO_MP3);
    console.log(AUDIO_MARKS);
} else {
    console.log("DYNAMIC PATH");
}

var select = document.getElementById('voiceSelect');
var audioVoice = select.options[select.selectedIndex].text;

// Main data structured used throughout
const audioTracker = {
    dynamic: POLLY_PAGE ? "N" : "Y",
    ssml: null,
    sdk: {
        connection: null,
        audio: {}
    },
    audioStatus: document.getElementById("audioStatus"),
    audioControl: document.getElementById("audio"),
    lastCT: -1, // makes it more efficient to look forward/backward
    lastSentenceIdx: 0,
    voice: POLLY_VOICES[0],
    existingMark: null,
    sentences: {},
    marks: {}
};

//set the src for audicontrol
audioTracker.audioControl.src = AUDIO_MP3[audioVoice];

function setVoice(voice) {
    console.log("Setting the voice");
    if (audioTracker.dynamic == "Y") {
        // get the audio dynamiccally; will change audio/marks inside in callbacks
        if (voice) audioTracker.voice = voice;

        audioTracker.audioStatus.innerText = "Audio loading";
        chooseRenderAudio();
    } else {
        // already have the audio - static
        audioTracker.audioControl.src = AUDIO_MP3[voice];
        console.log("Loading audiocontrol after setting voice");
        audioTracker.audioControl.load();
        audioTracker.voice = voice;
        // now load the marks for highlight
        loadMarks();
    }
}

audioTracker.audioControl.onloadstart = function() {
    console.log("Loading audio control");

    // if static mode, we already have MP3, now we load the marks. If dynamic, we did MP3 and marks together
    if (audioTracker.dynamic == "N") loadMarks();
}

// Function trigger when there is timeupdate on audio stream
audioTracker.audioControl.ontimeupdate = function() {
    loadMarks(); // in case control did not load
    // latest time in playback
    const ctSec = audioTracker.audioControl.currentTime;
    const ct = ctSec * 1000; //millis
    const audioSentence = findSentence(ct);
    //unhighlight the text
    unhighlight();
    if (audioSentence) {
        // if(audioTracker.existingMark !== audioSentence.mark){
        //     unhighlight();
        // }
        console.log(audioSentence)
        if (audioSentence && audioSentence.mark && audioSentence.mark.value.toLowerCase().startsWith("/html")) {
            //highlight the sentece
            highlight(audioSentence);
        }
    }
}

/**
Polly Synthesis Functions
Used for dynamic rendering of audio. 
Not used if pregenerated audio
 */
const S3_BUCKET = env.S3_BUCKET;
const REGION=env.REGION;
const IDP = env.IDP;
const LEXICONS = "compass";
const SLEEP_INTERVAL = 3000;
const INITIAL_SLEEP_INTERVAL = 1200;
const SSML_SYNC_LEN_THRESHOLD= 6000; // see https://docs.aws.amazon.com/polly/latest/dg/API_SynthesizeSpeech.html

function initSDK() {
    if (audioTracker.sdk.connection == null) {
        AWS.config.region = REGION; // Region
        AWS.config.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: IDP,
        });
        audioTracker.sdk.connection = {
            polly: new AWS.Polly({
                apiVersion: '2016-06-10'
            }),
            s3: new AWS.S3()
        };
    }
}

function chooseRenderAudio() {

    audioTracker.audioStatus.innerText = "Audio loading";
    audioTracker.audioControl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    audioTracker.audioControl.pause();
    audioTracker.audioControl.src = "";
    initSDK();
    stringOfSSML();
    console.log("DYNAUDIO - Using text " + audioTracker.ssml.text);

    if (audioTracker.ssml.text.length < SSML_SYNC_LEN_THRESHOLD) {
        renderAudio();
    }
    else {
        startRenderAudio();
    }
}

// if no ssml, generate default
function renderAudio() {

    const lexiconNames = LEXICONS.length == 0 ? [] : LEXICONS.split(",").map(s => s.trim());
    const pollyAudioInput = {
        LexiconNames: lexiconNames, 
        LanguageCode: POLLY_LANG_FULL,
        Engine: "neural",
        OutputFormat: "mp3",
        Text: audioTracker.ssml.text,
        TextType: "ssml",
        VoiceId: audioTracker.voice,

    };

    const pollyMarksInput = {
        LanguageCode: POLLY_LANG_FULL,
        Engine: "neural",
        OutputFormat: "json",
        Text: audioTracker.ssml.text,
        TextType: "ssml",
        VoiceId: audioTracker.voice,
        SpeechMarkTypes: ["ssml", "sentence"]
    };


    const signer = new AWS.Polly.Presigner(pollyAudioInput, audioTracker.sdk.connection.polly);
    signer.getSynthesizeSpeechUrl(pollyAudioInput, function(error, url) {
        if (error) console.log("GET SYNTH ERROR " + error);
        else {
            console.log("GOT POLLY URL " + url);
            audioTracker.sdk.audio[audioTracker.voice] = url;
            console.log("Dynamic URL to use is " + audioTracker.sdk.audio[audioTracker.voice]);
            audioTracker.audioControl.src = audioTracker.sdk.audio[audioTracker.voice];
            audioTracker.audioControl.load();
            audioTracker.audioStatus.innerText = "In progress: mp3 ready";

            audioTracker.sdk.connection.polly.synthesizeSpeech(pollyMarksInput, function(markError, markData) {
                if (markError) console.log(markError, markError.stack); // an error occurred
                else {
                    console.log("Polly marks output:\n"); // successful response    
                    console.log(markData);
                    const marksStr = new TextDecoder().decode(markData.AudioStream);
                    console.log(marksStr);
                    audioTracker.sentences[audioTracker.voice] = [];
                    audioTracker.marks[audioTracker.voice] = [];
                    doLoadMarks(marksStr);
                    audioTracker.audioStatus.innerText = "Audio ready";
                }
            });
        }
    });
}

function startRenderAudio() {

    const lexiconNames = LEXICONS.length == 0 ? [] : LEXICONS.split(",").map(s => s.trim());
    const asyncInput = {
        "mp3": {
            LexiconNames: lexiconNames,
            OutputS3BucketName: S3_BUCKET,
            LanguageCode: POLLY_LANG_FULL,
            Engine: "neural",
            OutputFormat: "mp3",
            Text: audioTracker.ssml.text,
            TextType: "ssml",
            VoiceId: audioTracker.voice
        },
        "marks": {
            OutputS3BucketName: S3_BUCKET,
            LanguageCode: POLLY_LANG_FULL,
            Engine: "neural",
            OutputFormat: "json",
            Text: audioTracker.ssml.text,
            TextType: "ssml",
            VoiceId: audioTracker.voice,
            SpeechMarkTypes: ["ssml", "sentence"]
        }
    };

    audioTracker.sdk.tasks = {
        "mp3": null,
        "marks": null
    };
    audioTracker.sdk.connection.polly.startSpeechSynthesisTask(asyncInput.mp3, function(error, data) {
        if (error) console.log(error, error.stack); // an error occurred
        else audioTracker.sdk.tasks.mp3 = data.SynthesisTask;
    });
    audioTracker.sdk.connection.polly.startSpeechSynthesisTask(asyncInput.marks, function(error, data) {
        if (error) console.log(error, error.stack); // an error occurred
        else audioTracker.sdk.tasks.marks = data.SynthesisTask;
    });
    setTimeout(checkAudioReady, INITIAL_SLEEP_INTERVAL);
}

function checkTaskDone(task) {
    if (!task) return "N";
    switch (task.TaskStatus) {
        case "completed":
            return "Y";
        case "inProgress":
        case "scheduled":
            return "N";
        case "failed":
        default:
            console.log("FAILED TO RUN TASK or ILLEGAL STATE");
            console.log(audioTracker);
            throw task;
    }
}

function checkAudioReady() {
    console.log("Checking audio ready");
    console.log(audioTracker);
    if (checkTaskDone(audioTracker.sdk.tasks.mp3) == "Y") {
        audioTracker.audioStatus.innerText = "mp3 ready, waiting marks";
        checkMarks();
    }
    else audioTracker.sdk.connection.polly.getSpeechSynthesisTask({
        TaskId: audioTracker.sdk.tasks.mp3.TaskId
    }, function(error, data) {
        if (error) console.log(error, error.stack); // an error occurred
        else {
            audioTracker.sdk.tasks.mp3 = data.SynthesisTask;
            if (checkTaskDone(audioTracker.sdk.tasks.mp3) == "N") {
                audioTracker.audioStatus.innerText = "mp3 in progress";
                setTimeout(checkAudioReady, SLEEP_INTERVAL);
            }
            else {
                audioTracker.audioStatus.innerText = "mp3 ready, waiting marks";
                checkMarks();
            }
        }
    });
}

function checkMarks() {
    console.log("Checking marks ready");
    console.log(audioTracker);
    if (checkTaskDone(audioTracker.sdk.tasks.marks) == "Y") fetchAudio();
    else audioTracker.sdk.connection.polly.getSpeechSynthesisTask({
        TaskId: audioTracker.sdk.tasks.marks.TaskId
    }, function(error, data) {
        if (error) console.log(error, error.stack); // an error occurred
        else {
            audioTracker.sdk.tasks.marks = data.SynthesisTask;
            if (checkTaskDone(audioTracker.sdk.tasks.marks) == "N") {
                audioTracker.audioStatus.innerText = "marks in progress";
                setTimeout(checkMarks, SLEEP_INTERVAL);
            }
            else fetchAudio();
        }
    });
}

function fetchAudio() {
    console.log("Audio Ready");
    console.log(audioTracker);

    audioTracker.audioStatus.innerText = "Downloading from S3";

    // get the s3 object name, after last slash
    const mp3Toks = audioTracker.sdk.tasks.mp3.OutputUri.split("/");
    const marksToks = audioTracker.sdk.tasks.marks.OutputUri.split("/");
    const mp3Obj = mp3Toks[mp3Toks.length - 1];
    const marksObj = marksToks[marksToks.length - 1];
    console.log("Getting mp3 " + mp3Obj);
    console.log("Getting marks " + marksObj);

    // for mp3 file, use S3 signed URL
    const mp3Signed = audioTracker.sdk.connection.s3.getSignedUrl("getObject", {
        Bucket: S3_BUCKET,
        Key: mp3Obj
    });
    console.log(mp3Signed);
    audioTracker.audioControl.src = mp3Signed;
    audioTracker.audioControl.load();

    // now marks
    audioTracker.sdk.connection.s3.getObject({
            Bucket: S3_BUCKET,
            Key: marksObj
        },
        function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else {
              console.log(data);
              const marksStr = new TextDecoder().decode(data.Body);
              console.log(marksStr);
              audioTracker.sentences[audioTracker.voice] = [];
              audioTracker.marks[audioTracker.voice] = [];
              doLoadMarks(marksStr);
            }
        });
    audioTracker.audioStatus.innerText = "Audio ready";
}

/**
XPath functions
 */
function getElementByXpath(path) {
    return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

function getElementsByXpath(path) {
    return document.evaluate(path, document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
}

function getXpathOfNode(node) {
    const xp = doGetXpathOfNode(node);
    if (xp.startsWith("/#document")) return xp.substring("/#document".length);
    else return xp;
}

function doGetXpathOfNode(node) {
    if (node.parentNode) {
        const parentX = doGetXpathOfNode(node.parentNode);
        // check previous sibs
        var numSibs = 1;
        for (var i = 0; i < node.parentNode.childNodes.length; i++) {
            if (node.parentNode.childNodes[i] == node) break;
            if (node.parentNode.childNodes[i].nodeName == node.nodeName) numSibs++;
        }
        return parentX + "/" + node.nodeName + "[" + numSibs + "]";
    } else {
        return "/" + node.nodeName;
    }
}

/**
SSML Functions
Used for dynamic rendering of audio. 
Not used if pregenerated audio
 */

function createSSML() {
    const ssmlText = "<speak></speak>";
    var parser = new DOMParser();
    const doc = parser.parseFromString(ssmlText, "text/xml"); //important to use "text/xml"
    audioTracker.ssml = {
        doc: doc,
        rootNode: doc.documentElement,
        node: doc.documentElement,
        inpara: "N"
    };
}

function addSSMLMark(name) {
    const mark = audioTracker.ssml.doc.createElement("mark");
    mark.setAttribute("name", name);
    audioTracker.ssml.node.appendChild(mark);
}

function startSSMLParagraph() {
    if (audioTracker.ssml.inpara == "Y") throw "Illegal para form";
    const p = audioTracker.ssml.doc.createElement("p");
    audioTracker.ssml.node.appendChild(p);
    audioTracker.ssml.inpara = "Y";
    audioTracker.ssml.node = p;
}

function endSSMLParagraph() {
    if (audioTracker.ssml.inpara == "N") throw "Illegal para form";
    audioTracker.ssml.inpara = "N";
    audioTracker.ssml.node = audioTracker.ssml.rootNode;
}

function startSSMLTag(tagName, attribs) {
    const tag = audioTracker.ssml.doc.createElement(tagName);
    for (var att in attribs) {
        tag.setAttribute(att, attribs[att]);
    }
    audioTracker.ssml.node.appendChild(tag);
    audioTracker.ssml.node = tag;
}

function endSSMLTag() {
    audioTracker.ssml.node = audioTracker.ssml.rootNode;
}

function addSSMLText(text) {
    const textNode = audioTracker.ssml.doc.createTextNode(text);
    audioTracker.ssml.node.appendChild(textNode);
}

function stringOfSSML() {
    const serializer = new XMLSerializer();
    audioTracker.ssml.text = serializer.serializeToString(audioTracker.ssml.doc);
}

function addSSMLValue(xpath) {
    const nval = getElementByXpath(xpath);
    if (!nval) return;

    startSSMLParagraph();
    const xval = getXpathOfNode(nval);
    const val = nval.innerText;
    addSSMLMark(xval);
    addSSMLText(val);
    endSSMLParagraph();
}

function addSSMLValueFromSection(section, optionalVal) {
    startSSMLParagraph();
    const xval = getXpathOfNode(section);
    const val = optionalVal ? optionalVal : section.innerText;
    addSSMLMark(xval);
    addSSMLText(val);
    endSSMLParagraph();
}

function addSSMLExplainer(explainer) {
    startSSMLParagraph();
    addSSMLMark("none");
    addSSMLText(explainer);
    endSSMLParagraph();
}

function addSSMLForEach(xpath) {
    const nlist = getElementsByXpath(xpath);
    console.log(nlist);
    while (true) {
        const nitem = nlist.iterateNext();
        if (!nitem) break;
        startSSMLParagraph();
        const xitem = getXpathOfNode(nitem);
        const val = nitem.innerText;
        addSSMLMark(xitem);
        addSSMLText(val);
        endSSMLParagraph();
    }
}

function buildSSMLFromDefault() {
    buildSSMLFromConfig({
        inclusions: [{"xpath": "/html/body"}]
    });
}

function buildSSMLFromConfig(spec) {

    // always exclude the audio element
    if (!spec.exclusions) spec.exclusions = [];
    spec.exclusions.push({"id": "prtp-audio"}, {"id": "prtp-audio-style"});

    console.log("Considering exclusions");
    const exclusions = [];
    spec.exclusions.forEach(function(excl) {
        if (excl.id || excl.xpath) {
            const xpath = excl.id ? "//*[@id='" + excl.id + "']" : excl.xpath;
            console.log(excl);
            console.log(xpath);
            const sec = getElementByXpath(xpath);
            if (sec) exclusions.push(sec);
        }
        else {
            throw "Illegal exclusion " + JSON.stringify(excl);
        }
    });

    createSSML();
    if (spec.inclusions) {
        console.log("Considering inclusions");
        // this is the config-driven render. 
        spec.inclusions.forEach(function(incl) {

            if (incl.id || incl.xpath) {
                const xpath = incl.id ? "//*[@id='" + incl.id + "']" : incl.xpath;
                console.log(incl);
                console.log(xpath);
                const sec = getElementByXpath(xpath);
                if (!sec) {
                    throw "Section not found " + JSON.stringify(incl)
                }
                buildSSMLSection(sec, exclusions);
            }
            else {
                throw "Illegal inclusion " + JSON.stringify(incl);
            }
        });
    }
    else {
        console.log("Default render");
        // this is the default render. we also take into account any exclusions
        // it works like the xslt
        const xpath = "/html/body";
        const thisSection = getElementByXpath(xpath);
        buildSSMLSection(thisSection, spec, exclusions);        
    }
    stringOfSSML();
    console.log(audioTracker.ssml.text);
}

function buildSSMLSection(section, exclusions) {
    console.log(section);

    // check exclusion
    for (var i = 0; i < exclusions.length; i++) if (exclusions[i] == section) return;

    // ignore if hidden
    if (section.attributes && (section.attributes.getNamedItem("hidden") || 
        section.attributes.getNamedItem("HIDDEN"))) {
        console.log("Skip hidden");
        return;
    }

    // examine the section
    const tagName=section.tagName;
    if (tagName) {
        // we don't allow audio|option|script|form|input|*[@hidden='']
        // we want p|h1|h2|h3|h4|li|pre|span|a|th/text()|td/text()|img/@alt
        switch(tagName.toLowerCase()) {
            // ignore
            case "audio":
            case "option":
            case "script":
            case "form":
            case "input":
                return;

            // these are text holders, but only if not hidden
            case "p":
            case "h1":
            case "h2":
            case "h3":
            case "h4":
            case "li": 
            case "pre":
            case "span":
            case "a":
                addSSMLValueFromSection(section);
                break;

            // consider img only if it has alt text
            case "img":
                // TODO - get this working
                alt = section.attributes.getNamedItem("alt");
                ALT = section.attributes.getNamedItem("ALT");
                if (alt) addSSMLValueFromSection(section, alt.value);
                else if (ALT) addSSMLValueFromSection(section, ALT.value);
                break;

            // th and td can be text holders or used to organize whole sections of the page
            case "th":
            case "td":
                for (var i = 0; i < section.childNodes.length; i++) {
                    const tblItem = section.childNodes[i];
                    if (tblItem.nodeType == 3) {
                        const text = tblItem.nodeValue.trim();
                        if (text.length > 0) {
                            addSSMLValueFromSection(section, text);
                        }
                    }
                }

            default:
                break;
        }
    }

    // Traverse the tree
    var i=0;
    var currentElementChild=section.childNodes[i];
    while (currentElementChild)    {
      // Recursively traverse the tree structure of the child node
      buildSSMLSection(currentElementChild, exclusions);
      i++;
      currentElementChild=section.childNodes[i];
    }
}

/**
Highlight functions. 
This function find the sentence in the audioTracker and return back the node and marks
 */

function findSentence(ct) {

    // compare ct with the last ct we looked at; normally we are moving forward; 
    // if we moved backward (rewind), consider that we are just moving from zero 
    if (audioTracker.lastCT > ct) {
        //console.log("Rewinding");
        audioTracker.lastSentenceIdx = 0;
    }
    audioTracker.lastCT = ct;

    // forward

    for (var i = audioTracker.lastSentenceIdx; i < audioTracker.sentences[audioTracker.voice].length; i++) {
        const diff = audioTracker.sentences[audioTracker.voice][i].time - ct;
        if (diff == 0) {
            //console.log("Exact time match");
            audioTracker.lastSentenceIdx = i;
            return audioTracker.sentences[audioTracker.voice][i]; // wow, exactly same time
        } else if (diff > 0) return null; // ct is too early for a word; nothing to do
        else if (i == audioTracker.sentences[audioTracker.voice].length - 1) {
            audioTracker.lastSentenceIdx = i;
            return null; // ct is later than last word, nothing to do
        } else {
            // check next word; is it in the time bound?
            const diff2 = audioTracker.sentences[audioTracker.voice][i + 1].time - ct;
            audioTracker.lastSentenceIdx = i;
            if (diff2 > 0) {
                // ct is sandwiched between i and i + 1. i is the word
                //console.log("Found between " + audioTracker.words[audioTracker.voice][i].time + " - " + 
                //  audioTracker.words[audioTracker.voice][i + 1].time);
                //console.log(audioTracker.sentences[audioTracker.voice][i])
                return audioTracker.sentences[audioTracker.voice][i];
            } else continue; // keep looking
        }
    }
}

function doLoadMarks(txt) {
    const slines = txt.split("\n");
    var lastMark = null;
    var sentenceNum = 0;
    var occInMark = {};
    slines.filter(ss => ss != "").forEach(function(s, index) {
        j = JSON.parse(s);
        if (j.type == "ssml") {
            audioTracker.marks[audioTracker.voice].push(j);
            lastMark = j;
            occInMark = {};
            sentenceNum = 0;
        } else if (j.type == "sentence") {
            if(lastMark == null){
                nextMarks = JSON.parse(slines[index+1])
                if(j.start === nextMarks.end)
                    lastMark = nextMarks
                else 
                    lastMark = JSON.parse(slines[index+2])
            }
            audioTracker.sentences[audioTracker.voice].push(j);
            j.mark = lastMark;
            j.sentencePos = sentenceNum;
            j.sentenceStart = -1;
            sentenceNum++;

            if (j.value in occInMark) occInMark[j.value] = occInMark[j.value] + 1;
            else occInMark[j.value] = 0;

            j.occurrence = occInMark[j.value];
        }
    });
}

function loadMarks() {
    // already loaded
    if (audioTracker.sentences[audioTracker.voice]) return;
    // fetch the marks
    audioTracker.sentences[audioTracker.voice] = [];
    audioTracker.marks[audioTracker.voice] = [];
    fetch(AUDIO_MARKS[audioTracker.voice]).then(response => response.text()).then(function(txt) {
        doLoadMarks(txt);
    });

    console.log(audioTracker);
}

// Function to highlight the sentence
function highlight(sentence) {
    // find the node in the DOM for the mark
    const node = getElementByXpath(sentence.mark.value);
    if (SCOLL_MODE) node.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    // window.scroll({top: node.offsetTop, behavior: 'smooth'});
    if (node && node != null) {
        sentence.mark.node = node;
        sentence.mark.origInnerHTML = node.innerHTML;
        sentence.mark.origInnerText = node.innerText;
        audioTracker.existingMark = sentence.mark;
        const mark = document.createElement("mark");
        var index =  sentence.mark.origInnerHTML.indexOf(sentence.value);
        if (index >= 0) { 
        newText =  sentence.mark.origInnerHTML.substring(0,index) + "<mark>" +  sentence.mark.origInnerHTML.substring(index,index+sentence.value.length) + "</mark>" + sentence.mark.origInnerHTML.substring(index + sentence.value.length);
        }else {
        text = sentence.mark.origInnerHTML
        newText = '<mark>'+text+'</mark>'
        }
        node.innerHTML = newText
    } else {
        //console.log("ERROR - unable to find node for mark " + JSON.stringify(sentence));
        return;
    }
}

function unhighlight() {
    if (audioTracker.existingMark) {
        audioTracker.existingMark.node.innerHTML = audioTracker.existingMark.origInnerHTML;
    }
    audioTracker.existingMark = null;
}

/**
 *  Debugging
 */

// my SSML marks should actually point to the HTML
function checkMarksOK() {
    const marks = audioTracker.marks.Joanna;
    console.log("Num marks " + marks.length);
    for (var i = 0; i < marks.length; i++) {
        console.log(marks[i]);
        try {
            console.log(getElementByXpath(marks[i].value));
            console.log(getElementByXpath(marks[i].value).innerHTML);
            console.log(getElementByXpath(marks[i].value).innerText);
            console.log(getElementByXpath(marks[i].value).outerText);
        } catch(e) {
            console.log(e);
        }
    }
}

function indentStr(indent) {
    var s= "";
    for (var i = 0; i < indent; i++) s += " ";
    return s;
}

// from https://www.permadi.com/tutorial/domTree/index.html
function traverseDOMTree(currentElement, indent) {
  if (currentElement) {
    var tagName=currentElement.tagName;
    // Prints the node tagName, such as <A>, <IMG>, etc
    if (tagName) {
        const id = currentElement.id ? currentElement.id : "";
        console.log(indentStr(indent) + currentElement.tagName + " " + id);
    }
    // Traverse the tree
    var i=0;
    var currentElementChild=currentElement.childNodes[i];
    while (currentElementChild)    {
      // Recursively traverse the tree structure of the child node
      traverseDOMTree(currentElementChild, indent + 1);
      i++;
      currentElementChild=currentElement.childNodes[i];
    }
  }
}

// useful to see the DOM we keep xpathing in...
function printDOM() {
    traverseDOMTree(document, 0);
}
