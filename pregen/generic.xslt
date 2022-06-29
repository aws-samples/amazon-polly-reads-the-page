<xsl:stylesheet version="2.0"
xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
xmlns:prtp="http://demo.aws/text-to-speech/aws">

<!--
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
-->

<xsl:strip-space elements="*"/>

<xsl:function name="prtp:getMark">
    <xsl:param name="theNode"/>
    <xsl:choose>
        <xsl:when test="string-length($theNode/local-name()) eq 0">
            <xsl:value-of select="prtp:getMark($theNode/parent::*)"/>
        </xsl:when>
        <xsl:when test="exists($theNode/parent::*)">
            <xsl:value-of select="concat(prtp:getMark($theNode/parent::*), '/', $theNode/local-name(), '[', 1 + count($theNode/preceding-sibling::*[local-name(.)= local-name($theNode)]), ']')"/>
        </xsl:when>
        <xsl:otherwise>
            <xsl:value-of select="concat('/', $theNode/local-name())"/>
        </xsl:otherwise>
    </xsl:choose>
</xsl:function>

<!-- skip the header -->
<xsl:template match="html/head">
</xsl:template>

<!-- skip the audio itself -->
<xsl:template match="html/body/table[@id='prtp-audio']">
</xsl:template>
<xsl:template match="html/body/style[@id='prtp-audio-style']">
</xsl:template>

<!-- For the body, work through it by applying its templates. This is the default. -->
<!-- COMMENT START -->
<xsl:template match="html/body">
<speak>
      <xsl:apply-templates />
</speak>
</xsl:template>
<!-- COMMENT END -->

<!-- skip these -->
<xsl:template match="audio|option|script|form|input|*[@hidden='']">
</xsl:template>

<!-- include these -->
<xsl:template match="p|h1|h2|h3|h4|li|pre|span|a|th/text()|td/text()">
<xsl:for-each select=".">
<p>
      <mark>
          <xsl:attribute name="name">
          <xsl:value-of select="prtp:getMark(.)"/>
          </xsl:attribute>
      </mark>
      <xsl:value-of select="normalize-space(.)"/>
</p>
</xsl:for-each>
</xsl:template>

<xsl:template match="img">
  <xsl:choose>
    <xsl:when test="string-length(./@alt) gt 0">
   <p>
      <mark>
          <xsl:attribute name="name">
          <xsl:value-of select="prtp:getMark(./@alt)"/>
          </xsl:attribute>
      </mark>
      <xsl:value-of select="normalize-space(./@alt)"/>
    </p>
    </xsl:when>
    </xsl:choose>
</xsl:template>

<!-- MODS -->

</xsl:stylesheet>
