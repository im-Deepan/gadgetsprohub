import { FieldExtractors } from '../FieldExtractors';
import { DataNormalizer } from '../DataNormalizer';

describe('DataNormalizer', () => {
  it('cleans text', () => {
    expect(DataNormalizer.cleanText('  Hello \n World  ')).toBe('Hello World');
  });

  it('parses price', () => {
    expect(DataNormalizer.parsePrice('$1,234.56')).toBe(1234.56);
    expect(DataNormalizer.parsePrice('£99.99')).toBe(99.99);
    expect(DataNormalizer.parsePrice('$12.99 - $15.99')).toBe(12.99);
    expect(DataNormalizer.parsePrice('$19.99 (List: $24.99)')).toBe(19.99);
    expect(DataNormalizer.parsePrice('12.9915.99')).toBe(12.99);
    expect(DataNormalizer.parsePrice(null)).toBe(0);
    expect(DataNormalizer.parsePrice('FREE')).toBe(0);
  });

  it('parses rating', () => {
    expect(DataNormalizer.parseRating('4.5 out of 5 stars')).toBe(4.5);
  });

  it('parses review count', () => {
    expect(DataNormalizer.parseReviewCount('1,234 ratings')).toBe(1234);
  });
});

describe('FieldExtractors', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('gets title', () => {
    document.body.innerHTML = '<span id="productTitle">  Test Product  </span>';
    expect(FieldExtractors.getTitle()).toBe('Test Product');
  });

  it('gets brand', () => {
    document.body.innerHTML = '<a id="bylineInfo">Brand: Test Brand</a>';
    expect(FieldExtractors.getBrand()).toBe('Test Brand');
  });

  it('gets ASIN from hidden input', () => {
    document.body.innerHTML = '<input type="hidden" id="ASIN" value="B012345678" />';
    expect(FieldExtractors.getAsin()).toBe('B012345678');
  });
});
