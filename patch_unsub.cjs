const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const htmlBodyUnsubReplace = `<a href="\\$\\{process.env.APP_URL || 'https://gadgetsprohub.com'\\}/products/\\$\\{product.slug\\}" style="display: inline-block; background-color: #6366f1; color: #ffffff; padding: 12px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 12px rgba(99,102,241,0.2); transition: background-color 0.2s;">
              View Full Product Sheet
            </a>
          </div>
            
          <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;">
            <p style="margin: 0;">You received this email because you registered for automated newsletter alerts on <strong>"\\$\\{escapeHTML(interest.categoryName)\\}"</strong> from your <strong>"Pick Where You Left"</strong> board.</p>
            <p style="margin: 4px 0 0 0;">© 2026 GadgetsProHub Affiliate Portal. All rights reserved.</p>
          </div>`;

const htmlBodyUnsubNew = `<a href="\\$\\{process.env.APP_URL || 'https://gadgetsprohub.com'\\}/products/\\$\\{product.slug\\}" style="display: inline-block; background-color: #6366f1; color: #ffffff; padding: 12px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 12px rgba(99,102,241,0.2); transition: background-color 0.2s;">
              View Full Product Sheet
            </a>
          </div>
            
          <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;">
            <p style="margin: 0;">You received this email because you registered for automated newsletter alerts on <strong>"\\$\\{escapeHTML(interest.categoryName)\\}"</strong> from your <strong>"Pick Where You Left"</strong> board.</p>
            <p style="margin: 4px 0 0 0;">
              <a href="\\$\\{process.env.APP_URL || 'https://gadgetsprohub.com'\\}/api/products/pick-left-unsubscribe?email=\\$\\{encodeURIComponent(recipientEmail)\\}&category=\\$\\{encodeURIComponent(interest.categoryName)\\}" style="color: #6366f1; text-decoration: underline;">Unsubscribe from this alert</a>
            </p>
            <p style="margin: 4px 0 0 0;">© 2026 GadgetsProHub Affiliate Portal. All rights reserved.</p>
          </div>`;

content = content.replace(htmlBodyUnsubReplace, htmlBodyUnsubNew);
fs.writeFileSync('server.ts', content);
console.log("Patched email html body");
