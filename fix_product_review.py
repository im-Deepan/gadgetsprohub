import re

with open('server.ts', 'r') as f:
    content = f.read()

product_review_old = """        const user = await User.findById(uId);
        if (!user) return res.status(404).json({ error: 'User validation failed.' });

        const newReview = {"""

product_review_new = """        const user = await User.findById(uId);
        if (!user) return res.status(404).json({ error: 'User validation failed.' });

        const existingReview = product.reviews.find((r: any) => r.userId.toString() === uId.toString());
        if (existingReview) return res.status(400).json({ error: 'You have already reviewed this product.' });

        const newReview = {"""

content = content.replace(product_review_old, product_review_new)

product_review_local_old = """        const product = localProducts.find((p: any) => p._id === id);
        if (!product) return res.status(404).json({ error: 'Product not found.' });

        const user = localUsers.find((u: any) => u._id === uId);
        if (!user) return res.status(404).json({ error: 'User validation failed.' });

        if (!product.reviews) product.reviews = [];"""

product_review_local_new = """        const product = localProducts.find((p: any) => p._id === id);
        if (!product) return res.status(404).json({ error: 'Product not found.' });

        const user = localUsers.find((u: any) => u._id === uId);
        if (!user) return res.status(404).json({ error: 'User validation failed.' });

        if (!product.reviews) product.reviews = [];
        
        const existingReview = product.reviews.find((r: any) => r.userId === uId);
        if (existingReview) return res.status(400).json({ error: 'You have already reviewed this product.' });"""

content = content.replace(product_review_local_old, product_review_local_new)

with open('server.ts', 'w') as f:
    f.write(content)
