# Next Steps: Completing Your n8n Automation

Awesome! Since you have successfully added your MongoDB and Telegram credentials in n8n, you are ready to build the actual logic. 

To answer your previous question: **n8n doesn't magically know how to extract prices from a webpage.** We have to explicitly tell it to visit the link, grab the price, and update MongoDB. 

Here is your exact step-by-step guide to implement this.

---

## Step 1: Set up the Real-Time Webhook (For App Clicks)

When a user views a product in your app, the app will ping this webhook to update the price in real-time.

1. **Create a new workflow** in n8n.
2. Add a **Webhook Node**:
   - Set **Method** to `POST`.
   - Set **Path** to `realtime-update` (or whatever you prefer).
   - Set **Respond Mode** to `Using 'Respond to Webhook' Node`.
3. Save the workflow. Click the **Webhook URL** and copy the **Production URL**. (You will need this later for your app).

---

## Step 2: Fetch the Product Page (The Scraper)

*Why we need this:* When a user clicks a product in your app, the app sends a Webhook to n8n containing the product's `affiliateLink`. We need n8n to "visit" this link (just like a web browser does) and download the page's HTML code so we can find the price inside it.

Here is exactly how to set this up:

1. Click the **+** button on your n8n canvas, search for **HTTP Request**, and add it.
2. Connect it: Drag a line from the right side of your **Webhook Node** to the left side of this **HTTP Request Node**.
3. Double-click the **HTTP Request Node** to configure it:
   - **Method**: Keep it as `GET` (this tells the node to "get" the webpage).
   - **URL**: We cannot type a hardcoded link here because the link changes depending on which product the user clicked. We need to use a variable.
     - Look for the little gears icon `⚙️` next to the URL input box, click it, and select **Add Expression**.
     - In the expression editor that pops up, type exactly this: 
       `{{ $json.body.affiliateLink }}`
     - *How this works:* It tells n8n to look at the data that just came in from the Webhook, go inside the `body`, and grab the `affiliateLink` URL that your Node.js app sent.
   - **Authentication**: Leave as `None`.

**⚠️ Crucial Warning About Scraping Big Sites (Amazon, Flipkart, etc.):**
If your affiliate links go to massive e-commerce sites, they have anti-bot protection. If you try a simple HTTP Request, they might return a `403 Forbidden` error or a CAPTCHA page instead of the real product page.
- **If it works:** Great! Move to Step 3.
- **If you get blocked:** You cannot use a direct HTTP Request. Instead, you must sign up for a Web Scraping API (like ScraperAPI, ZenRows, or Apify). In that case, the URL in this node would be the *ScraperAPI URL*, and you would pass your affiliate link to them as a parameter. They bypass the bot-protection and return the HTML to n8n.

---

## Step 3: Extract the Price from the HTML

Now that n8n has the webpage's HTML, we need to extract the price.

1. Add an **HTML Extract Node**.
2. Connect it after the HTTP Request Node.
3. Configure it:
   - **Source Data**: `JSON` (select the data property where the HTML is, usually `data`).
   - **Extraction Values**: Add a new value.
     - **Key**: `scrapedPrice`
     - **CSS Selector**: Enter the CSS selector for the price on the target website. *(Example for Amazon: `.a-price-whole`, Example for Flipkart: `div._30jeq3`)*.
     - **Return Value**: `Text`.

---

## Step 4: Clean the Scraped Price

Websites usually return prices like `₹1,499` or `$99.99`. MongoDB needs a clean number (e.g., `1499`).

1. Add a **Code Node**.
2. Connect it after the HTML Extract node.
3. Add this JavaScript snippet to clean the price:
   ```javascript
   let rawPrice = $input.first().json.scrapedPrice;
   
   // Remove commas, currency symbols, and convert to number
   let cleanPrice = Number(rawPrice.replace(/[^0-9.-]+/g,""));
   
   return {
     productId: $('Webhook').first().json.body.productId,
     newPrice: cleanPrice
   };
   ```

---

## Step 5: Update MongoDB

Now we save the new price back to your database.

1. Add a **MongoDB Node**.
2. Connect it after the Code Node.
3. Configure it:
   - **Credential**: Select your MongoDB credential.
   - **Operation**: `Update`.
   - **Collection**: `products`.
   - **Update Key**: `_id`.
   - **Fields to Update**: 
     - Set `_id` to `{{ $json.productId }}` (Use expression).
     - Set `price` to `{{ $json.newPrice }}` (Use expression).
     - Set `updatedAt` to `{{ new Date().toISOString() }}`.

---

## Step 6: Respond to the Webhook

We need to tell your app that the update was successful.

1. Add a **Respond to Webhook Node**.
2. Connect it to the end of your workflow.
3. Configure it:
   - **Respond With**: `JSON`
   - **Response Body**: 
     ```json
     {
       "success": true,
       "price": {{$json.newPrice}}
     }
     ```

---

## Step 7: Activate & Connect to Your App

1. **Toggle the workflow to ACTIVE** (Top right corner in n8n). *Important: Webhooks only work in production mode if the workflow is active!*
2. Copy the **Production Webhook URL** from the Webhook node.
3. Go to your application's Admin Panel -> **Settings**.
4. Paste the URL into the **N8N Realtime Webhook URL** field and save.

### You're Done!
Now, whenever a product needs an update, your app will hit this webhook, n8n will fetch the webpage, scrape the price, update MongoDB, and return the new price! You can repeat this exact logic (Steps 2-5) inside your Background Job loop for the automatic 10-minute updates.
