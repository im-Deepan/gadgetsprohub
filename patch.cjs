const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldStr = `      const subject = \`📬 New Product Alert: \${product.name} Added!\`;
      const prodImage = (product.images && product.images[0]) ? product.images[0] : 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600';
        
      const htmlBody = \`
        <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #f1f5f9; border-radius: 24px; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
          <div style="text-align: center; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9;">
            <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 16px; background-color: #f5f3ff; font-size: 24px; text-align: center; margin-bottom: 12px;">📬</div>
            <h1 style="font-size: 22px; font-weight: 900; color: #1e293b; margin: 0; text-transform: uppercase; letter-spacing: -0.025em;">GadgetsProHub</h1>
            <p style="font-size: 11px; color: #6366f1; font-weight: 800; margin: 4px 0 0 0; font-family: monospace; tracking-wider; text-transform: uppercase;">Direct Pick-History Newsletter</p>
          </div>
            
          <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 12px 0;">
            Hello from GadgetsProHub!
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
            Based on your interest in the <strong>"\${interest.categoryName}"</strong> category from your <strong>"Pick Where You Left"</strong> history board, we've drafted this notification because a matching new product has been successfully added to our catalog!
          </p>
            
          <div style="margin: 28px 0; padding: 20px; border: 1px solid #f1f5f9; border-radius: 20px; background-color: #fafbfd; display: flex; flex-direction: row; align-items: center; gap: 20px;">
            <div style="flex-shrink: 0; width: 110px; height: 110px; display: flex; align-items: center; justify-content: center; background-color: #ffffff; border-radius: 14px; border: 1px solid #f1f5f9; padding: 8px;">
              <img src="\${prodImage}" alt="\${product.name}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
            </div>
            <div style="flex: 1; min-width: 0;">
              <span style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #6366f1; font-family: monospace; letter-spacing: 0.05em;">\${product.brand || 'Premium Brand'}</span>
              <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 4px 0; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">\${product.name}</h3>
              <p style="font-size: 12px; color: #64748b; margin: 0 0 8px 0; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">\${product.description || 'View details and latest specifications on our site.'}</p>
              <div style="font-size: 15px; font-weight: 900; color: #0f172a;">
                $\${product.price}
                \${product.originalPrice ? \`<span style="font-size: 11px; text-decoration: line-through; color: #94a3b8; font-weight: 500; margin-left: 6px;">$\${product.originalPrice}</span>\` : ''}
              </div>
            </div>
          </div>
            
          <div style="text-align: center; margin: 28px 0 20px 0;">
            <a href="\${process.env.APP_URL || 'https://gadgetsprohub.com'}/products/\${product.slug}" style="display: inline-block; background-color: #6366f1; color: #ffffff; padding: 12px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 12px rgba(99,102,241,0.2); transition: background-color 0.2s;">
              View Full Product Sheet
            </a>
          </div>
            
          <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;">
            <p style="margin: 0;">You received this email because you registered for automated newsletter alerts on <strong>"\${interest.categoryName}"</strong> from your <strong>"Pick Where You Left"</strong> board.</p>
            <p style="margin: 4px 0 0 0;">© 2026 GadgetsProHub Affiliate Portal. All rights reserved.</p>
          </div>
        </div>
      \`;

      if (transporter) {
        try {
          await transporter.sendMail({
            from: \`"GadgetsProHub Newsletter" <\${sender}>\`,
            to: recipientEmail,
            subject,
            html: htmlBody
          });
          console.log(\`[Success] Direct email sent to \${recipientEmail} for category interest: \${interest.categoryName}\`);
        } catch (mailErr: any) {
          console.warn(\`Failed to send email to \${recipientEmail}:\`, mailErr.message);
        }
      } else {
        console.log(\`[Simulated Email to \${recipientEmail}]\\nSubject: \${subject}\\nBody: Product: \${product.name}\`);
      }`;

const newStr = `      const subject = \`📬 New Product Alert: \${product.name} Added!\`;
      const prodImage = (product.images && product.images[0]) ? product.images[0] : 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600';
        
      const htmlBody = \`
        <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #f1f5f9; border-radius: 24px; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
          <div style="text-align: center; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9;">
            <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 16px; background-color: #f5f3ff; font-size: 24px; text-align: center; margin-bottom: 12px;">📬</div>
            <h1 style="font-size: 22px; font-weight: 900; color: #1e293b; margin: 0; text-transform: uppercase; letter-spacing: -0.025em;">GadgetsProHub</h1>
            <p style="font-size: 11px; color: #6366f1; font-weight: 800; margin: 4px 0 0 0; font-family: monospace; tracking-wider; text-transform: uppercase;">Direct Pick-History Newsletter</p>
          </div>
            
          <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 12px 0;">
            Hello from GadgetsProHub!
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
            Based on your interest in the <strong>"\${escapeHTML(interest.categoryName)}"</strong> category from your <strong>"Pick Where You Left"</strong> history board, we've drafted this notification because a matching new product has been successfully added to our catalog!
          </p>
            
          <div style="margin: 28px 0; padding: 20px; border: 1px solid #f1f5f9; border-radius: 20px; background-color: #fafbfd; display: flex; flex-direction: row; align-items: center; gap: 20px;">
            <div style="flex-shrink: 0; width: 110px; height: 110px; display: flex; align-items: center; justify-content: center; background-color: #ffffff; border-radius: 14px; border: 1px solid #f1f5f9; padding: 8px;">
              <img src="\${prodImage}" alt="\${escapeHTML(product.name)}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
            </div>
            <div style="flex: 1; min-width: 0;">
              <span style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #6366f1; font-family: monospace; letter-spacing: 0.05em;">\${escapeHTML(product.brand || 'Premium Brand')}</span>
              <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 4px 0; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">\${escapeHTML(product.name)}</h3>
              <p style="font-size: 12px; color: #64748b; margin: 0 0 8px 0; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">\${escapeHTML(product.description || 'View details and latest specifications on our site.')}</p>
              <div style="font-size: 15px; font-weight: 900; color: #0f172a;">
                $\${product.price}
                \${product.originalPrice ? \`<span style="font-size: 11px; text-decoration: line-through; color: #94a3b8; font-weight: 500; margin-left: 6px;">$\${product.originalPrice}</span>\` : ''}
              </div>
            </div>
          </div>
            
          <div style="text-align: center; margin: 28px 0 20px 0;">
            <a href="\${process.env.APP_URL || 'https://gadgetsprohub.com'}/products/\${product.slug}" style="display: inline-block; background-color: #6366f1; color: #ffffff; padding: 12px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 12px rgba(99,102,241,0.2); transition: background-color 0.2s;">
              View Full Product Sheet
            </a>
          </div>
            
          <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;">
            <p style="margin: 0;">You received this email because you registered for automated newsletter alerts on <strong>"\${escapeHTML(interest.categoryName)}"</strong> from your <strong>"Pick Where You Left"</strong> board.</p>
            <p style="margin: 4px 0 0 0;">© 2026 GadgetsProHub Affiliate Portal. All rights reserved.</p>
          </div>
        </div>
      \`;

      if (transporter) {
        try {
          await transporter.sendMail({
            from: \`"GadgetsProHub Newsletter" <\${sender}>\`,
            to: recipientEmail,
            subject,
            html: htmlBody
          });
          console.log(\`[Success] Direct email sent to \${recipientEmail} for category interest: \${interest.categoryName}\`);
        } catch (mailErr: any) {
          console.warn(\`Failed to send email to \${recipientEmail}:\`, mailErr.message);
        }
      } else {
        console.log(\`[Simulated Email to \${recipientEmail}]\\nSubject: \${subject}\\nBody: Product: \${product.name}\`);
      }
      
      // Consume interest: delete from mongo or local array
      if (isMongoConnected && interest._id) {
        await PickLeftInterest.deleteOne({ _id: interest._id }).catch((e: any) => console.warn(e));
      } else {
        localPickLeftInterests = localPickLeftInterests.filter(
          (i: any) => !(i.email.toLowerCase() === recipientEmail.toLowerCase() && i.categoryName === interest.categoryName)
        );
        await syncPickLeftInterestsToLocalFile();
      }`;

if (content.includes(oldStr)) {
  content = content.replace(oldStr, newStr);
  fs.writeFileSync('server.ts', content);
  console.log("Patched successfully!");
} else {
  console.log("Could not find the target string.");
}
