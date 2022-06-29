'''
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
'''
import html5lib
from xml.etree import ElementTree
from xml.dom import minidom

import sys
import os

# https://stackoverflow.com/questions/14440375/how-to-add-an-element-to-xml-file-by-using-elementtree
def prettify(elem):
	rough_string = ElementTree.tostring(elem, 'utf-8')
	reparsed = minidom.parseString(rough_string)
	toopretty = reparsed.toprettyxml(indent="  ")

	# now get rid of ns <html:x> and </html:x>
	pretty = toopretty.replace("<html:", "<")
	pretty = pretty.replace("</html:", "</")
	return pretty



if len(sys.argv) != 3:
	print("Usage FixHTML source target")
	sys.exit(1)

SOURCE_FILE = sys.argv[1]
TARGET_FILE= sys.argv[2]

print(SOURCE_FILE)
print(TARGET_FILE)
with open(SOURCE_FILE, "rb") as f:
    document = html5lib.parse(f)
    fixed = prettify(document).encode('ascii', 'ignore')
    with open(TARGET_FILE, "wb") as fo:
    	fo.write(fixed)
