import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import { escapeHTML } from '../config';
import { Product, Category, PickLeftInterest, SundayAutomationLog } from '../models';
import {
  getIsMongoConnected,
  localCategories,
  localProducts,
  localPickLeftInterests,
  localSundayAutomationLogs,
  saveLocalSundayLogs,
  saveLocalProducts,
  syncProductsToSeedFile
} from '../storage';
import { captureError } from '../../utils/errorTracker';

let mailTransport: any = null;

export function getMailTransport() {
  if (!mailTransport) {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    const hasAnySmtpConfig = host || port || user || pass;

    if (hasAnySmtpConfig) {
      if (!host || !port || !user || !pass) {
        console.warn("⚠️ SMTP Mail configuration is incomplete. Missing fields: " + 
          [
            !host && "SMTP_HOST",
            !port && "SMTP_PORT",
            !user && "SMTP_USER",
            !pass && "SMTP_PASS"
          ].filter(Boolean).join(", ") + 
          ". SMTP emails will be logged and simulated."
        );
        return null;
      }

      const numericPort = Number(port);
      mailTransport = nodemailer.createTransport({
        host,
        port: numericPort,
        secure: numericPort === 465,
        auth: { user, pass },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
      console.log("Nodemailer SMTP transport configured successfully.");
    } else {
      console.log("SMTP mail server is not configured. SMTP emails will be logged and simulated.");
    }
  }
  return mailTransport;
}

export function escapeRegExp(value: any) {
  const str = typeof value === 'string' ? value : String(value || '');
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function triggerProductAddedEmailNotifications(product: any) {
  try {
    if (product.publishingStatus && product.publishingStatus !== 'published') {
      return;
    }
    const subcategoryName = (product.subcategory || '').toString().trim();
    if (!subcategoryName) return;

    let categoryName = '';
    const isMongoConnected = getIsMongoConnected();
    if (isMongoConnected) {
      const populatedProduct = await Product.findById(product._id).populate('category');
      if (populatedProduct && populatedProduct.category) {
        categoryName = (populatedProduct.category as any).name;
      }
    } else {
      const catId = product.category;
      if (catId && typeof catId === 'object') {
        categoryName = (catId as any).name || '';
      } else {
        const matchedCat = localCategories.find((c: any) => c._id === catId || c.slug === catId);
        if (matchedCat) {
          categoryName = matchedCat.name;
        }
      }
    }

    let interests: any[] = [];
    if (isMongoConnected) {
      interests = await PickLeftInterest.find({
        $or: [
          { categoryName: { $regex: new RegExp('^' + escapeRegExp(subcategoryName) + '$', 'i') } },
          { categoryName: { $regex: new RegExp('^' + escapeRegExp(categoryName) + '$', 'i') } }
        ],
        isVerified: true
      });
    } else {
      interests = localPickLeftInterests.filter(
        (interest: any) => 
          interest.categoryName.trim().toLowerCase() === subcategoryName.toLowerCase() ||
          interest.categoryName.trim().toLowerCase() === categoryName.toLowerCase()
      );
    }

    if (interests.length === 0) return;

    const transporter = getMailTransport();
    const sender = process.env.SENDER_EMAIL || process.env.SMTP_USER || 'newsletter@gadgetsprohub.com';

    for (const interest of interests) {
      const recipientEmail = interest.email;
      if (!recipientEmail) continue;

      const subject = `📬 New Product Alert: ${escapeHTML(product.name)} Added!`;
      const prodImage = (product.images && product.images[0]) ? product.images[0] : 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600';
      
      const htmlBody = `
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
            Based on your interest in the <strong>"${escapeHTML(interest.categoryName)}"</strong> category from your <strong>"Pick Where You Left"</strong> history board, we've drafted this notification because a matching new product has been successfully added to our catalog!
          </p>
          
          <div style="margin: 28px 0; padding: 20px; border: 1px solid #f1f5f9; border-radius: 20px; background-color: #fafbfd; display: flex; flex-direction: row; align-items: center; gap: 20px;">
            <div style="flex-shrink: 0; width: 110px; height: 110px; display: flex; align-items: center; justify-content: center; background-color: #ffffff; border-radius: 14px; border: 1px solid #f1f5f9; padding: 8px;">
              <img src="${prodImage}" alt="${escapeHTML(product.name)}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
            </div>
            <div style="flex: 1; min-width: 0;">
              <span style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #6366f1; font-family: monospace; letter-spacing: 0.05em;">${escapeHTML(product.brand || 'Premium Brand')}</span>
              <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 4px 0; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${escapeHTML(product.name)}</h3>
              <p style="font-size: 12px; color: #64748b; margin: 0 0 8px 0; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${escapeHTML(product.description || 'View details and latest specifications on our site.')}</p>
              <div style="font-size: 15px; font-weight: 900; color: #0f172a;">
                $${product.price}
                ${product.originalPrice ? `<span style="font-size: 11px; text-decoration: line-through; color: #94a3b8; font-weight: 500; margin-left: 6px;">$${product.originalPrice}</span>` : ''}
              </div>
            </div>
          </div>
          
          <div style="text-align: center; margin: 28px 0 20px 0;">
            <a href="${process.env.APP_URL || 'https://gadgetsprohub.com'}/products/${product.slug}" style="display: inline-block; background-color: #6366f1; color: #ffffff; padding: 12px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 12px rgba(99,102,241,0.2); transition: background-color 0.2s;">
              View Full Product Sheet
            </a>
          </div>
          
          <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;">
            <p style="margin: 0;">You received this email because you registered for automated newsletter alerts on <strong>"${escapeHTML(interest.categoryName)}"</strong> from your <strong>"Pick Where You Left"</strong> board.</p>
            <p style="margin: 4px 0 0 0;">
              <a href="${process.env.APP_URL || 'https://gadgetsprohub.com'}/api/products/pick-left-unsubscribe?email=${encodeURIComponent(recipientEmail)}&category=${encodeURIComponent(interest.categoryName)}" style="color: #6366f1; text-decoration: underline;">Unsubscribe from this alert</a>
            </p>
            <p style="margin: 4px 0 0 0;">© 2026 GadgetsProHub Affiliate Portal. All rights reserved.</p>
          </div>
        </div>
      `;

      if (transporter) {
        try {
          await transporter.sendMail({
            from: `"GadgetsProHub Newsletter" <${sender}>`,
            to: recipientEmail,
            subject,
            html: htmlBody
          });
          console.log(`[Success] Direct email sent to ${recipientEmail} for category interest: ${escapeHTML(interest.categoryName)}`);
        } catch (mailErr: any) {
          console.warn(`Failed to send email to ${recipientEmail}:`, mailErr.message);
        }
      } else {
        console.log(`[Simulated Email to ${recipientEmail}]\nSubject: ${subject}\nBody: Product: ${escapeHTML(product.name)}`);
      }
    }
  } catch (err: any) {
    console.error('Error in triggerProductAddedEmailNotifications:', err.message);
  }
}

export const SUNDAY_DUMMY_PRODUCTS_POOL = [
  {
    name: 'Quantum Wireless Charging Pad',
    description: 'Next-generation induction coaster using resonance waves to charge active devices.',
    longDescription: 'Charging reinvented. This minimalist slab projects an active resonant electromagnetic canopy, recharging up to three devices within a 30cm vicinity. No contact required. Constructed with spacecraft-grade tempered alloys, custom temperature metrics logging, and rapid output controls.',
    brand: 'NexaCharge',
    price: 89.99,
    originalPrice: 119.99,
    discount: 25,
    images: ['https://images.unsplash.com/photo-1622445262465-2481c4574875?w=800'],
    features: ['Contactless Resonant Charging', 'Concurrent 3-Device Power', 'Intelligent Thermal Throttling', 'Premium Tempered-Alloy Body'],
    specifications: {
      'Effective range': 'Up to 30 centimeters',
      'Power delivery': 'Concurrent 45W distribution',
      'Efficiency': 'Over 92% transmission rate',
      'Warranty': '3 years robust global coverage'
    },
    inStock: true,
    tags: ['charging', 'wireless', 'next-gen', 'quantum'],
    trending: true,
    featured: true,
    pros: ['Completely contactless mechanics', 'Fabulous architectural profile', 'Zero noise emission'],
    cons: ['Needs dedicated high-capacity adapter', 'A tad heavier than conventional pads'],
    seoTitle: 'NexaCharge Quantum Wireless Charging Coaster Review',
    seoDescription: 'Check specifications, pricing and active referral codes for the NexaCharge contactless quantum resonant charger.',
    seoKeywords: ['resonant wireless charger', 'contactless charge', 'next-gen desk accessories']
  },
  {
    name: 'Holographic Ambient Desktop Projector',
    description: 'Immersive table-top lens casing that projects atmospheric widgets and calendars.',
    longDescription: 'Turn your immediate desk workspace into a vibrant sci-fi dashboard. Projects high-fidelity calendars, notification counts, real-time UTC times, district traffic loops, and personalized quotes in ultra-crisp transparent light directly above the pad.',
    brand: 'Holowork',
    price: 249.99,
    originalPrice: 299.99,
    discount: 16,
    images: ['https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800'],
    features: ['Transparent Laser Casing projection', 'Interactive Gestures Support', 'Real-Time IoT Widget Feeds', 'Ambient Breathing Glow Modes'],
    specifications: {
      'Projector Type': 'Laser Diode Array',
      'Resolution Ratio': 'Virtual Full HD rendering',
      'Gestures': 'Optical Tracking Camera',
      'Hardware Connectivity': 'Wi-Fi 6 / Bluetooth 5.3'
    },
    inStock: true,
    tags: ['projector', 'desktop', 'laser', 'hologram'],
    trending: true,
    featured: false,
    pros: ['Stunning high-impact visuals', 'Responsive hands-free gestures', 'Very compact modern casing'],
    cons: ['Requires moderate dimly lit ambient settings', 'Requires stable desk surface for optimal resolution'],
    seoTitle: 'Holowork Interactive Projector Specs and Analysis',
    seoDescription: 'Complete product breakdown for Holowork ambient multi-indicator laser table project arrays.',
    seoKeywords: ['hologram widget', 'laser desktop display', 'immersive smart desk']
  },
  {
    name: 'Acoustic Soundproofing Smart Panels',
    description: 'Geometric interlocking fiber tiles with integrated sound-reactive lighting.',
    longDescription: 'Elevate your studio, streaming corner, or office acoustics while adding dramatic depth. These high-density interlocking acoustic tiles absorb high frequencies, damp echo patterns, and house individual micro-LED visualizers syncing seamlessly along with ambient soundwaves.',
    brand: 'Harmonix',
    price: 129.99,
    originalPrice: 159.99,
    discount: 18,
    images: ['https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800'],
    features: ['High-Absorption PET Fiber', 'Interlocking Magnetic Joints', 'Sound-Reactive Micro RGB LED Matrix', 'Dedicated companion setup app'],
    specifications: {
      'Absorption Rate': '0.85 NRC rating',
      'Panel Count': '6 interlocking hexagonal tiles',
      'Tile Diameter': '30cm per hexagon edge',
      'Core material': 'Recycled thermal flame retardant fiber'
    },
    inStock: true,
    tags: ['audio', 'acoustic', 'lighting', 'gaming'],
    trending: true,
    featured: false,
    pros: ['Clean elegant visual look', 'Excellent high-echo damping performance', 'Very simple modular magnetic hookup'],
    cons: ['Setup requires double-sided adhesive sheets', 'LED panels require central auxiliary wall power line'],
    seoTitle: 'Harmonix Modular Light-Up Sound Absorption Tiles',
    seoDescription: 'Maximize audio clarity and design stream-ready configurations with Harmonix active tiles.',
    seoKeywords: ['sound dampening panels', 'rgb foam tiles', 'stream studio lighting']
  },
  {
    name: 'Smart Ergonomic Office Seat Pad',
    description: 'Active posture-analyzing memory gel cushion with Bluetooth analytics.',
    longDescription: 'Reclaim your spine during long curation shifts. This memory gel cushion features embedded pressure distribution matrices, logging sitting habits, sending reminders to stretch, and auto-tuning internal pneumatic levels to maximize pelvis comfort.',
    brand: 'Anatomi',
    price: 79.99,
    originalPrice: 99.99,
    discount: 20,
    images: ['https://images.unsplash.com/photo-1580481072645-022f9a6dbf27?w=800'],
    features: ['Multi-Sensor Pressure Registry', 'Cooling Honeycomb Aerogel', 'Automated Posture Reminders', 'Up to 30 days battery monitoring'],
    specifications: {
      'Gel Weight': '1.2kg heavy-duty support',
      'Sensor array': '16 active pressure zones',
      'Battery life': 'Rechargeable coin core (1 month duration)',
      'Dimensions': '45 x 40 x 5 centimeters'
    },
    inStock: true,
    tags: ['office', 'ergonomics', 'smart-home', 'accessories'],
    trending: true,
    featured: true,
    pros: ['Very comfortable memory aerogel', 'Insightful posture analytics charts', 'Lightweight portable design'],
    cons: ['Needs active Bluetooth sync to log long logs', 'Machine washable outer cover only'],
    seoTitle: 'Anatomi Orthopedic Sensor Gel Cushion Specifications',
    seoDescription: 'Read user reviews and discount criteria for the Anatomi active posture gel pad.',
    seoKeywords: ['office posture cushion', 'ergonomic gel support', 'smart work desk seat']
  }
];

export function generateUniqueProduct(index: number, sundayStr: string): any {
  const template = SUNDAY_DUMMY_PRODUCTS_POOL[index % SUNDAY_DUMMY_PRODUCTS_POOL.length];
  const hashStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  const name = `${template.name} [Sunday Draft ${sundayStr} ${hashStr}]`;
  const slug = `${template.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${sundayStr.toLowerCase()}-${hashStr.toLowerCase()}`;
  
  return {
    ...template,
    name,
    slug,
    _id: "prod_sun_" + sundayStr.replace(/-/g, '') + "_" + hashStr,
    clicks: 0,
    conversions: 0,
    rating: 0,
    totalReviews: 0,
    reviews: [],
    publishingStatus: 'draft',
    inStock: false,
    trending: false,
    createdAt: new Date()
  };
}

export async function runSundayAutomation(targetSundayStr?: string, forceEmail?: string) {
  const useMongo = getIsMongoConnected();
  let sundayStr = targetSundayStr;
  
  if (!sundayStr) {
    const today = new Date();
    if (today.getDay() !== 0) {
      return null;
    }
    sundayStr = today.toISOString().split('T')[0];
  }

  if (useMongo) {
    try {
      const existingLog = await SundayAutomationLog.findOne({ sundayDate: sundayStr });
      if (existingLog) {
        console.log(`Sunday automation already executed for date ${sundayStr}.`);
        return existingLog;
      }
    } catch (e) {
      console.error("Error checking Sunday Log:", e);
    }
  } else {
    const existingLog = localSundayAutomationLogs.find((l: any) => l.sundayDate === sundayStr);
    if (existingLog) {
      console.log(`Sunday local automation already executed for date ${sundayStr}.`);
      return existingLog;
    }
  }

  console.log(`Running Sunday Automation Task for date range: ${sundayStr}`);

  let categoryId = "665a0001bc93ef2d8c000001";
  if (useMongo) {
    try {
      const cat = await Category.findOne({ slug: 'electronics' });
      if (cat) categoryId = cat._id.toString();
      else {
        const anyCat = await Category.findOne({});
        if (anyCat) categoryId = anyCat._id.toString();
      }
    } catch (e) {
      console.warn(e);
    }
  } else {
    const cat = localCategories.find((c: any) => c.slug === 'electronics') || localCategories[0];
    if (cat) categoryId = cat._id;
  }

  const newProdsRaw = [
    generateUniqueProduct(localSundayAutomationLogs.length * 2, sundayStr),
    generateUniqueProduct(localSundayAutomationLogs.length * 2 + 1, sundayStr)
  ];

  newProdsRaw.forEach(p => {
    p.category = categoryId;
  });

  const addedIds: string[] = [];
  const addedProductsList: any[] = [];

  if (useMongo) {
    try {
      for (const raw of newProdsRaw) {
        const productData = {
          ...raw,
          _id: new mongoose.Types.ObjectId(),
          category: new mongoose.Types.ObjectId(categoryId),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        const product = new Product(productData);
        await product.save();
        addedIds.push(product._id.toString());
        addedProductsList.push(product);
      }
      await syncProductsToSeedFile();
    } catch (err: any) {
      captureError(err, { context: 'saving automatic Sunday product drafts' });
    }
  } else {
    for (const raw of newProdsRaw) {
      localProducts.unshift(raw);
      addedIds.push(raw._id);
      addedProductsList.push(raw);
    }
    await syncProductsToSeedFile().catch(e => console.warn(e));
  }

  const authorEmail = (typeof forceEmail === 'string' && forceEmail) ? forceEmail : process.env.AUTHOR_EMAIL;
  if (!authorEmail) {
    console.warn("AUTHOR_EMAIL not provided, skipping notification email.");
  }
  const emailSubject = `🚨 Sunday Reminder: New Curation Product Drafts Queued for Admin Review – ${sundayStr}`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 25px;">
        <span style="font-size: 32px;">🕒</span>
        <h2 style="color: #4f46e5; margin: 10px 0 5px 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Sunday Draft Curation Active</h2>
        <p style="color: #64748b; font-size: 13px; margin: 0;">Automated product candidate creation & admin review queue</p>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #334155;">Hello Admin,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        Today is <strong>Sunday (${sundayStr})</strong>! Our automated curation engine has run and queued <strong>two candidate product drafts</strong> in the admin review dashboard.
      </p>

      <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #1e293b;">🆕 Queued Product Draft Candidates:</h3>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
          ${addedProductsList.map(p => `
            <li style="margin-bottom: 10px;">
              <strong style="color: #0f172a;">${p.name}</strong><br/>
              <em>Brand:</em> ${p.brand} | <em>Price:</em> $${p.price.toFixed(2)}<br/>
              <em>Features:</em> ${p.features ? p.features.slice(0, 3).join(', ') : 'None'}<br/>
              <span style="color: #6366f1; font-size: 11px; font-family: monospace;">Slug: ${p.slug}</span>
            </li>
          `).join('')}
        </ul>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        <strong>Trending Period:</strong> These items have been marked as <strong>Trending</strong>. They will stay displayed in the trending selection space for precisely <strong>7 days</strong>, after which our dynamic backend auto-migrates them to standard curated listings.
      </p>

      <div style="border-top: 1px solid #f1f5f9; padding-top: 15px; margin-top: 25px; font-size: 11px; color: #94a3b8; text-align: center;">
        <p style="margin: 0;">This reminder alerts the admin control room systematically.</p>
        <p style="margin: 3px 0 0 0;">Platform commission records log via supportataffiliateprohub@gmail.com</p>
      </div>
    </div>
  `;

  let sentStatus = 'Simulated';
  let errorDetails = '';

  const transporter = getMailTransport();
  if (transporter && authorEmail) {
    try {
      const sender = process.env.SENDER_EMAIL || process.env.SMTP_USER || 'no-reply@gadgetsprohub.com';
      await transporter.sendMail({
        from: `"GadgetsProHub Automatons" <${sender}>`,
        to: authorEmail,
        subject: emailSubject,
        html: htmlBody
      });
      sentStatus = 'Success';
    } catch (err: any) {
      sentStatus = 'Failed';
      errorDetails = err.message;
    }
  } else if (!authorEmail) {
    sentStatus = 'Skipped';
    errorDetails = 'AUTHOR_EMAIL environment variable not configured';
  }

  const logObj = {
    sundayDate: sundayStr,
    runAt: new Date(),
    localProductsAddedIds: addedIds,
    emailSentTo: authorEmail || 'no-author-email@gadgetsprohub.com',
    emailSubject,
    emailBody: htmlBody,
    sentStatus,
    errorDetails
  };

  let finalLog: any = null;
  if (useMongo) {
    try {
      const mongoLog = new SundayAutomationLog({
        ...logObj,
        productsAdded: addedIds
          .filter(id => id && mongoose.Types.ObjectId.isValid(id))
          .map(id => new mongoose.Types.ObjectId(id))
      });
      await mongoLog.save();
      finalLog = mongoLog;
    } catch (err: any) {
      captureError(err, { context: 'Sunday Log Creation' });
    }
  } else {
    finalLog = {
      _id: "log_sun_" + Math.random().toString(36).substring(2, 9),
      ...logObj,
      productsAdded: addedProductsList
    };
    localSundayAutomationLogs.unshift(finalLog);
    saveLocalSundayLogs();
    saveLocalProducts();
  }

  return finalLog;
}
