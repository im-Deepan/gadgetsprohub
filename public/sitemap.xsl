<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <title>gadgetsprohub XML Sitemap</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style type="text/css">
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
            color: #1e293b;
            background: #f8fafc;
            padding: 30px 20px;
            line-height: 1.5;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            border: 1px solid #e2e8f0;
            overflow: hidden;
          }
          .header {
            background: #0f172a;
            color: #ffffff;
            padding: 28px 32px;
            border-bottom: 2px solid #3b82f6;
          }
          .header h1 {
            font-size: 22px;
            font-weight: 700;
            letter-spacing: -0.02em;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .header h1 span {
            color: #60a5fa;
          }
          .header p {
            font-size: 14px;
            color: #94a3b8;
            margin-top: 6px;
          }
          .stats {
            display: flex;
            gap: 20px;
            padding: 16px 32px;
            background: #f1f5f9;
            border-bottom: 1px solid #e2e8f0;
            font-size: 13px;
            font-weight: 600;
            color: #475569;
          }
          .stats span b {
            color: #0f172a;
          }
          .table-wrapper {
            overflow-x: auto;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            text-align: left;
          }
          th {
            background: #f8fafc;
            color: #475569;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.05em;
            padding: 14px 20px;
            border-bottom: 1px solid #e2e8f0;
          }
          td {
            padding: 12px 20px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
          }
          tr:hover td {
            background: #f8fafc;
          }
          a {
            color: #2563eb;
            text-decoration: none;
            word-break: break-all;
            font-weight: 500;
          }
          a:hover {
            text-decoration: underline;
            color: #1d4ed8;
          }
          .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 600;
            background: #e2e8f0;
            color: #334155;
          }
          .badge-high {
            background: #dbeafe;
            color: #1e40af;
          }
          .badge-med {
            background: #fef3c7;
            color: #92400e;
          }
          .badge-img {
            background: #ede9fe;
            color: #6b21a8;
          }
          .footer {
            padding: 16px 32px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #64748b;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>gadgetsprohub <span>XML Sitemap</span></h1>
            <p>Generated dynamically for Google Search Console, Bing Webmaster, Google Merchant Center and SEO Crawlers.</p>
          </div>

          <xsl:if test="sitemap:sitemapindex">
            <div class="stats">
              <span>Type: <b>Sitemap Index</b></span>
              <span>Total Sub-Sitemaps: <b><xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/></b></span>
            </div>
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style="width: 60%;">Sitemap URL</th>
                    <th style="width: 40%;">Last Modified (UTC)</th>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
                    <tr>
                      <td>
                        <a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a>
                      </td>
                      <td>
                        <span class="badge"><xsl:value-of select="sitemap:lastmod"/></span>
                      </td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </div>
          </xsl:if>

          <xsl:if test="sitemap:urlset">
            <div class="stats">
              <span>Type: <b>URL Feed</b></span>
              <span>Total URLs: <b><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></b></span>
              <span>Images Indexed: <b><xsl:value-of select="count(sitemap:urlset/sitemap:url/image:image)"/></b></span>
            </div>
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style="width: 50%;">Page Location (URL)</th>
                    <th style="width: 15%;">Images</th>
                    <th style="width: 12%;">Change Frequency</th>
                    <th style="width: 8%;">Priority</th>
                    <th style="width: 15%;">Last Modified</th>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="sitemap:urlset/sitemap:url">
                    <tr>
                      <td>
                        <a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a>
                      </td>
                      <td>
                        <xsl:if test="count(image:image) &gt; 0">
                          <span class="badge badge-img"><xsl:value-of select="count(image:image)"/> Image(s)</span>
                        </xsl:if>
                        <xsl:if test="count(image:image) = 0">
                          <span style="color: #94a3b8;">-</span>
                        </xsl:if>
                      </td>
                      <td>
                        <span class="badge"><xsl:value-of select="sitemap:changefreq"/></span>
                      </td>
                      <td>
                        <xsl:choose>
                          <xsl:when test="sitemap:priority &gt;= 0.8">
                            <span class="badge badge-high"><xsl:value-of select="sitemap:priority"/></span>
                          </xsl:when>
                          <xsl:otherwise>
                            <span class="badge badge-med"><xsl:value-of select="sitemap:priority"/></span>
                          </xsl:otherwise>
                        </xsl:choose>
                      </td>
                      <td>
                        <xsl:value-of select="sitemap:lastmod"/>
                      </td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </div>
          </xsl:if>

          <div class="footer">
            gadgetsprohub XML Sitemap Engine • RFC 9309 Compliant • Clean Canonical URLs
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
