const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(/\$\{interest\.categoryName\}/g, '${escapeHTML(interest.categoryName)}');
content = content.replace(/\$\{product\.name\}/g, '${escapeHTML(product.name)}');
content = content.replace(/\$\{product\.brand \|\| 'Premium Brand'\}/g, "${escapeHTML(product.brand || 'Premium Brand')}");
content = content.replace(/\$\{product\.description \|\| 'View details and latest specifications on our site\.'\}/g, "${escapeHTML(product.description || 'View details and latest specifications on our site.')}");

const injectConsume = `        console.log(\`[Simulated Email to \${recipientEmail}]\\nSubject: \${subject}\\nBody: Product: \${product.name}\`);
      }
      
      // Consume interest: delete from mongo or local array
      if (isMongoConnected && interest._id) {
        await PickLeftInterest.deleteOne({ _id: interest._id }).catch((e) => console.warn(e));
      } else {
        localPickLeftInterests = localPickLeftInterests.filter(
          (i) => !(i.email.toLowerCase() === recipientEmail.toLowerCase() && i.categoryName === interest.categoryName)
        );
        await syncPickLeftInterestsToLocalFile();
      }
    }
  } catch (err: any) {`;

content = content.replace(/        console\.log\(\`\[Simulated Email to \$\{recipientEmail\}\]\\nSubject: \$\{subject\}\\nBody: Product: \$\{product\.name\}\`\);\n      \}\n    \}\n  \} catch \(err: any\) \{/, injectConsume);

fs.writeFileSync('server.ts', content);
console.log("Patched successfully!");
