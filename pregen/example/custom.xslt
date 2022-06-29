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

<!-- For the body, work through it by applying its templates. This is the default. -->
<!--
<xsl:template match="html/body">
<speak>
      <xsl:apply-templates />
</speak>
</xsl:template>
-->

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


<xsl:template match="*[@id='title']">
    <mark>
        <xsl:attribute name="name">
        <xsl:value-of select="prtp:getMark(.)"/>
        </xsl:attribute>
    </mark>
     <xsl:apply-templates />
</xsl:template>   
    
<xsl:template match="*[@id='main']">
    <mark>
        <xsl:attribute name="name">
        <xsl:value-of select="prtp:getMark(.)"/>
        </xsl:attribute>
    </mark>
     <xsl:apply-templates />
</xsl:template>   
    
<xsl:template match="*[@id='maintable']">
    <mark>
        <xsl:attribute name="name">
        <xsl:value-of select="prtp:getMark(.)"/>
        </xsl:attribute>
    </mark>
    <xsl:variable name="tiles" select="./tbody"/>
    <xsl:variable name="tiles-nw" select="$tiles/tr[1]/td[1]"/>
    <xsl:variable name="tiles-ne" select="$tiles/tr[1]/td[2]"/>
    <xsl:variable name="tiles-sw" select="$tiles/tr[2]/td[1]"/>
    <xsl:variable name="tiles-se" select="$tiles/tr[2]/td[2]"/>
    <xsl:variable name="tiles-seq" select="($tiles-nw,  $tiles-sw, $tiles-ne, $tiles-se)"/>
    <xsl:for-each select="$tiles-seq">
         <xsl:apply-templates />  
    </xsl:for-each>
</xsl:template>   
    
<xsl:template match="*[@id='qbtable']">
    <mark>
        <xsl:attribute name="name">
        <xsl:value-of select="prtp:getMark(.)"/>
        </xsl:attribute>
    </mark>
    <xsl:variable name="best-sell" select="."/>
    <xsl:variable name="best-sell-rows" select="$best-sell//tr[position() gt 1 and position() lt 5]"/>
    <xsl:variable name="best-sell-headings" select="$best-sell//th"/>
  <p>
      <mark>
          <xsl:attribute name="name">
          <xsl:value-of select="prtp:getMark($best-sell/h2)"/>
          </xsl:attribute>
      </mark>
      <xsl:value-of select="normalize-space($best-sell/h2)"/>
  </p>    
  <xsl:for-each select="$best-sell-rows">
    <xsl:variable name="curr-row" select="."/>
    <p>Row <xsl:value-of select="position()"/></p>
    <xsl:for-each select="$best-sell-headings">
      <xsl:variable name="col-pos" select="position()"/>
      <p><xsl:value-of select="."/></p>
      <xsl:apply-templates select="$curr-row/td[$col-pos]"/>      
    </xsl:for-each>
  </xsl:for-each>
</xsl:template>   
    
    
<xsl:template match="html/body">
<speak>
  <xsl:apply-templates select="/html/body/*[@id='title']"/>
  
  <xsl:apply-templates select="/html/body/*[@id='main']"/>
  
  <xsl:apply-templates select="/html/body/*[@id='maintable']"/>
  
  <xsl:apply-templates select="/html/body/*[@id='qbtable']"/>
  
</speak>
</xsl:template>
<xsl:template match="*[@id='wrapup']"></xsl:template>

<xsl:template match="span[@style = 'color:blue']" >
<p>
      <mark>
          <xsl:attribute name="name">
          <xsl:value-of select="prtp:getMark(.)"/>
          </xsl:attribute>
      </mark>
      <prosody volume="x-loud">Tom Brady</prosody>
</p>
</xsl:template>

</xsl:stylesheet>

