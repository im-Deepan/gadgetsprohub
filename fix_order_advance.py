import re

with open('server.ts', 'r') as f:
    content = f.read()

order_advance_old = """        const currentIndex = statuses.indexOf(order.status as any);
        const nextIndex = (currentIndex + 1) % statuses.length;
        order.status = statuses[nextIndex];"""

order_advance_new = """        const currentIndex = statuses.indexOf(order.status as any);
        const nextIndex = Math.min(currentIndex + 1, statuses.length - 1);
        order.status = statuses[nextIndex];"""

content = content.replace(order_advance_old, order_advance_new)

order_advance_old_2 = """        const currentIndex = statuses.indexOf(order.status);
        const nextIndex = (currentIndex + 1) % statuses.length;
        order.status = statuses[nextIndex];"""

order_advance_new_2 = """        const currentIndex = statuses.indexOf(order.status);
        const nextIndex = Math.min(currentIndex + 1, statuses.length - 1);
        order.status = statuses[nextIndex];"""

content = content.replace(order_advance_old_2, order_advance_new_2)

with open('server.ts', 'w') as f:
    f.write(content)
