import re

with open('src/pages/ProductDetail.tsx', 'r') as f:
    content = f.read()

prod_edit_old = """      if (res.ok) {
        setProduct({ ...product, ...updatePayload });
        setIsEditing(false);"""

prod_edit_new = """      if (res.ok) {
        const updatedProduct = await res.json();
        setProduct(updatedProduct.product || updatedProduct);
        setIsEditing(false);"""

content = content.replace(prod_edit_old, prod_edit_new)

with open('src/pages/ProductDetail.tsx', 'w') as f:
    f.write(content)
