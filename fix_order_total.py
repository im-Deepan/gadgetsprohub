import re

with open('server.ts', 'r') as f:
    content = f.read()

order_total_old = """      const { items, totalAmount } = req.body;

      const trackingNumber = 'TRK' + Math.floor(100000000 + Math.random() * 900000000);
      const carrier = ['FedEx Ground', 'UPS Next Day Air', 'DHL Express', 'USPS Priority Mail'][Math.floor(Math.random() * 4)];
      const estDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

      if (isMongoConnected) {"""

order_total_new = """      const { items } = req.body;

      const trackingNumber = 'TRK' + Math.floor(100000000 + Math.random() * 900000000);
      const carrier = ['FedEx Ground', 'UPS Next Day Air', 'DHL Express', 'USPS Priority Mail'][Math.floor(Math.random() * 4)];
      const estDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

      if (isMongoConnected) {
        let computedTotal = 0;
        for (const item of items) {
          const prod = await Product.findById(item.product);
          if (prod) computedTotal += (prod.price || 0) * (item.quantity || 1);
        }
        const totalAmount = computedTotal;"""

content = content.replace(order_total_old, order_total_new)

order_local_old = """      } else {
        const newOrder = {
          _id: "order_" + Math.random().toString(36).substring(2, 9),
          userId: uId,
          items: items.map((it: any) => {
            const matchedProduct = localProducts.find((lp: any) => lp._id === it.product);
            return { ...it, product: matchedProduct || it.product };
          }),
          totalAmount,
          status: 'Processing',"""

order_local_new = """      } else {
        let computedTotal = 0;
        const newOrder = {
          _id: "order_" + Math.random().toString(36).substring(2, 9),
          userId: uId,
          items: items.map((it: any) => {
            const matchedProduct = localProducts.find((lp: any) => lp._id === it.product);
            if (matchedProduct) computedTotal += (matchedProduct.price || 0) * (it.quantity || 1);
            return { ...it, product: matchedProduct || it.product };
          }),
          totalAmount: computedTotal,
          status: 'Processing',"""

content = content.replace(order_local_old, order_local_new)

with open('server.ts', 'w') as f:
    f.write(content)
