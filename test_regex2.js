const html = `<span class="a-price a-text-price" data-a-size="b" data-a-strike="true" data-a-color="secondary"><span class="a-offscreen">$123.45</span><span aria-hidden="true">$123.45</span></span>`;
const listPriceMatch = html.match(/<span\s+class=["'][^"']*a-text-price[^"']*["'][^>]*>\s*<span\s+class=["']a-offscreen["'][^>]*>[^0-9]*([\d\.,]+)/i) || html.match(/<span\s+class=["']a-text-strike["'][^>]*>[^0-9]*([\d\.,]+)/i);
if (listPriceMatch) {
  console.log(parseFloat(listPriceMatch[1].replace(/,/g, '')));
}
