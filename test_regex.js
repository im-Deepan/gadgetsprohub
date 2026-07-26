const html = `data-a-dynamic-image="{&quot;https://m.media-amazon.com/images/I/71Y.jpg&quot;:[1000,1000],&quot;https://m.media-amazon.com/images/I/61H.jpg&quot;:[1000,1000]}"`;
const match = html.match(/data-a-dynamic-image=["']([^"']+)["']/i);
if (match) {
  const decoded = match[1].replace(/&quot;/g, '"');
  const imgObj = JSON.parse(decoded);
  console.log(Object.keys(imgObj));
}
