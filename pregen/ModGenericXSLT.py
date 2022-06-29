'''
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
'''
import sys
import json

def xpathOf(s):
	if 'id' in s:
		return "*[@id='" + s['id'] + "']"
	else:
		return s["xpath"]


def make_custom(inex, generic):
	mods = ""

	if 'inclusions' in inex:
		applies = ""
		generic = generic.replace("<!-- COMMENT START -->", "<!--")
		generic = generic.replace("<!-- COMMENT END -->", "-->")
		for i in inex['inclusions']:
			s = """
	<xsl:template match="_XPATH_">
		<mark>
		    <xsl:attribute name="name">
		    <xsl:value-of select="prtp:getMark(.)"/>
		    </xsl:attribute>
		</mark>
	     <xsl:apply-templates />
	</xsl:template>		
			"""
			s = s.replace("_XPATH_", xpathOf(i))
			thisApply = """
		<xsl:apply-templates select="/html/body/__XP__"/>
		"""
			thisApply = thisApply.replace("__XP__", xpathOf(i))
			applies += thisApply
			mods += s
		mods += """
	<xsl:template match="html/body">
	<speak>"""
		mods +=  applies
		mods += """
	</speak>
	</xsl:template>
	"""

	if 'exclusions' in inex:
		for e in inex['exclusions']:
			s = '<xsl:template match="_XPATH_"></xsl:template>'.replace("_XPATH_", xpathOf(e))
			mods += s

	generic = generic.replace("<!-- MODS -->", mods)
	return generic

if len(sys.argv) != 3:
	print("Usage ModGenericXSLT source target")
	sys.exit(1)

SOURCE_FILE = sys.argv[1]
TARGET_FILE= sys.argv[2]

print(SOURCE_FILE)
print(TARGET_FILE)
inex = None
generic = None
with open(SOURCE_FILE, 'r') as j:
  inex = json.load(j)

with open('generic.xslt', 'r') as g:
  generic = g.read()

custom = make_custom(inex, generic)
with open(TARGET_FILE, "w") as fo:
	fo.write(custom)
