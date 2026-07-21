import { ParserResult } from '../../types';
import { PageValidator } from './PageValidator';
import { ProductBuilder } from './ProductBuilder';
import { ProductValidator } from './ProductValidator';
import { extensionStorage } from '../../services/storage';

export class AmazonParser {
  public static async parse(): Promise<ParserResult> {
    const startTime = performance.now();
    const result: ParserResult = {
      isValidPage: false,
      errors: [],
      warnings: [],
      logs: [],
      data: null,
      durationMs: 0
    };

    const log = (msg: string) => result.logs.push(`[${new Date().toISOString()}] ${msg}`);
    log('Starting Amazon product extraction pipeline');

    try {
      // 1. Validate Page
      const isProductPage = PageValidator.isProductPage();
      if (!isProductPage) {
        result.errors.push('Not a supported Amazon product page. Please navigate to a specific product.');
        log('Page validation failed.');
        result.durationMs = performance.now() - startTime;
        return result;
      }
      result.isValidPage = true;
      log('Page validation passed.');

      // 2. Build Product Data
      log('Extracting product fields...');
      const settings = await extensionStorage.getSettings();
      const builder = new ProductBuilder(log, settings);
      const data = builder.build();

      // 3. Validate Product Data
      log('Validating extracted data...');
      const validationResult = ProductValidator.validate(data);
      if (validationResult.errors.length > 0) {
        result.errors.push(...validationResult.errors);
        log(`Validation failed with ${validationResult.errors.length} errors.`);
      } else {
        result.data = data;
        log('Product data successfully extracted and validated.');
      }
      
      if (validationResult.warnings.length > 0) {
        result.warnings.push(...validationResult.warnings);
      }

      // 4. Calculate Telemetry/Metrics
      const fields = [
        { name: 'title', val: data.name || (data as any).title },
        { name: 'brand', val: data.brand && data.brand !== 'Unknown Brand' ? data.brand : null },
        { name: 'asin', val: data.asin },
        { name: 'currentPrice', val: data.currentPrice },
        { name: 'originalPrice', val: data.originalPrice },
        { name: 'rating', val: data.rating },
        { name: 'reviewCount', val: data.reviewCount },
        { name: 'description', val: data.description },
        { name: 'bulletFeatures', val: data.bulletFeatures && data.bulletFeatures.length > 0 ? data.bulletFeatures : null },
        { name: 'images', val: data.images && data.images.length > 0 ? data.images : null },
        { name: 'productUrl', val: data.productUrl }
      ];
      const failedFields = fields.filter(f => !f.val).map(f => f.name);
      result.metrics = {
        extractionSuccessRate: Math.round(((fields.length - failedFields.length) / fields.length) * 100),
        failedFields
      };
      log(`Telemetry: Success Rate ${result.metrics.extractionSuccessRate}% | Failed Fields: ${failedFields.join(', ') || 'None'}`);

    } catch (e: any) {
      result.errors.push(`Critical parser error: ${e.message}`);
      log(`Exception caught: ${e.stack}`);
    }

    result.durationMs = Math.round(performance.now() - startTime);
    log(`Extraction completed in ${result.durationMs}ms`);
    return result;
  }
}
