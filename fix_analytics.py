import re

with open('server.ts', 'r') as f:
    content = f.read()

analytics_old = """        const seenKeys = new Set<string>();
        analytics.forEach(a => {
          let identifier = '';
          if (a.userId && typeof a.userId === 'object') {
            identifier = a.userId.email || a.userId._id || '';
          } else if (a.userId && typeof a.userId === 'string') {
            identifier = a.userId;
          }
          if (!identifier) {
            identifier = `guest_${a.ipAddress || '127.0.0.1'}`;
          }
 
          const dist = sanitizeDistrict(a.district || 'Chennai');
          const comboKey = `${identifier}_${dist}`;

          if (!seenKeys.has(comboKey)) {
            seenKeys.add(comboKey);
            if (districtCounts[dist] !== undefined) {
              districtCounts[dist]++;
            } else {
              districtCounts[dist] = 1;
            }
          }
        });"""

analytics_new = """        const distAggr = await Analytics.aggregate([
          { $group: { _id: { id: { $ifNull: ["$userId", "$ipAddress"] }, dist: { $ifNull: ["$district", "Chennai"] } } } },
          { $group: { _id: "$_id.dist", count: { $sum: 1 } } }
        ]);
        
        distAggr.forEach(row => {
          const distName = row._id.charAt(0).toUpperCase() + row._id.slice(1).toLowerCase();
          const dist = TAMIL_NADU_DISTRICTS.includes(distName) ? distName : 'Chennai';
          if (districtCounts[dist] !== undefined) {
            districtCounts[dist] += row.count;
          } else {
            districtCounts[dist] = row.count;
          }
        });"""

content = content.replace(analytics_old, analytics_new)

with open('server.ts', 'w') as f:
    f.write(content)
